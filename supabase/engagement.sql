-- ═══════════════════════════════════════════════════════════════
--  FLEX — Moteur d'engagement : rétention/trending, notifications,
--  signalements (modération conforme stores). Après schema/economy.
-- ═══════════════════════════════════════════════════════════════

-- ── Signaux d'engagement sur les posts ──────────────────────────
alter table public.flexes add column if not exists shares_count int not null default 0;
alter table public.flexes add column if not exists views_count int not null default 0;
alter table public.flexes add column if not exists dwell_ms_total bigint not null default 0;

create index if not exists flexes_trending_idx on public.flexes (likes_count desc, created_at desc);

-- Enregistre une vue + temps de rétention (dwell) de façon agrégée.
create or replace function public.record_view(p_post uuid, p_dwell_ms int default 0)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.flexes
     set views_count = views_count + 1,
         dwell_ms_total = dwell_ms_total + greatest(0, p_dwell_ms)
   where id = p_post;
end;$$;

create or replace function public.record_share(p_post uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.flexes set shares_count = shares_count + 1 where id = p_post;
end;$$;

-- ── Score de tendance (rétention + interactivité, décroissance temporelle)
--   Plus un post retient l'attention et fait réagir, plus il est propulsé.
create or replace view public.trending_posts as
  select f.*,
    (
      f.likes_count * 1.0
      + f.comments_count * 2.0
      + f.shares_count * 3.0
      + least(f.dwell_ms_total / 1000.0, 5000) * 0.05      -- rétention (plafonnée)
    ) / power(greatest(extract(epoch from (now() - f.created_at)) / 3600.0, 1) + 2, 1.4) as trend_score
  from public.flexes f;

-- ── Notifications (valorisation + incitation à publier) ─────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'hype',  -- hype | trend | social | system
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications (user_id, created_at desc);

-- Pousse une notification (utilisable par triggers / Edge Functions).
create or replace function public.push_notification(p_user uuid, p_kind text, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body)
  values (p_user, p_kind, p_title, p_body);
end;$$;

-- Quand un post franchit un palier de likes, on félicite l'auteur.
create or replace function public.on_flex_hype() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.likes_count = 50 and old.likes_count < 50 then
    perform public.push_notification(new.author_id, 'trend',
      'Ton post cartonne ! 🔥', 'Partage ton prochain look pour doubler tes vues.');
  elsif new.likes_count = 200 and old.likes_count < 200 then
    perform public.push_notification(new.author_id, 'trend',
      'Tu es en tendance ! ✦', 'Ne t’arrête pas là, montre ton mood du jour.');
  end if;
  return new;
end;$$;
drop trigger if exists trg_flex_hype on public.flexes;
create trigger trg_flex_hype after update of likes_count on public.flexes
  for each row execute function public.on_flex_hype();

-- ── Signalements (modération / conformité Apple & Google) ───────
do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'message')),
  target_id   uuid not null,
  reason      text not null,
  details     text,
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- Traitement d'un signalement par l'admin.
create or replace function public.review_report(p_report uuid, p_status public.report_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  update public.reports set status = p_status, reviewed_at = now() where id = p_report;
end;$$;

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

drop policy if exists "notif_read_self" on public.notifications;
create policy "notif_read_self"   on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notif_update_self" on public.notifications;
create policy "notif_update_self" on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self"  on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_read_admin" on public.reports;
create policy "reports_read_admin"   on public.reports for select using (public.is_admin() or auth.uid() = reporter_id);

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null; end $$;
