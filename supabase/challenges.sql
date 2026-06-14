-- ═══════════════════════════════════════════════════════════════
--  FLEX — challenges.sql  (ADDITIF, idempotent)
--  Cercle des Défis : gagner un défi débloque une fonctionnalité
--  PAYANTE pour une durée donnée (table feature_unlocks).
--  À exécuter dans Supabase → SQL Editor (après schema.sql).
-- ═══════════════════════════════════════════════════════════════

-- ── Déblocages temporaires de fonctionnalités (récompenses) ────
create table if not exists public.feature_unlocks (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  feature    text not null,
  until      timestamptz not null,
  source     text not null default 'challenge',
  created_at timestamptz not null default now()
);
create index if not exists feature_unlocks_user_idx on public.feature_unlocks (user_id, until desc);
alter table public.feature_unlocks enable row level security;
drop policy if exists "unlocks_read_self" on public.feature_unlocks;
create policy "unlocks_read_self" on public.feature_unlocks
  for select using (auth.uid() = user_id);
-- (écriture uniquement via RPC security definer ci-dessous)
revoke insert, update, delete on public.feature_unlocks from anon, authenticated;

-- ── Défis ──────────────────────────────────────────────────────
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  reward_feature text not null default 'vip',
  reward_days   int  not null default 7 check (reward_days between 1 and 90),
  status        text not null default 'open' check (status in ('open','closed')),
  winner_id     uuid references public.profiles(id),
  ends_at       timestamptz not null,
  created_at    timestamptz not null default now()
);
create index if not exists challenges_status_idx on public.challenges (status, ends_at desc);
alter table public.challenges enable row level security;
drop policy if exists "challenges_read" on public.challenges;
create policy "challenges_read" on public.challenges for select using (true);
drop policy if exists "challenges_insert_self" on public.challenges;
create policy "challenges_insert_self" on public.challenges
  for insert with check (auth.uid() = creator_id);

-- ── Participants ───────────────────────────────────────────────
create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table public.challenge_participants enable row level security;
drop policy if exists "cp_read" on public.challenge_participants;
create policy "cp_read" on public.challenge_participants for select using (true);
drop policy if exists "cp_join_self" on public.challenge_participants;
create policy "cp_join_self" on public.challenge_participants
  for insert with check (auth.uid() = user_id);

-- ── Déclarer le vainqueur (créateur uniquement) ───────────────
-- → clôture le défi ET débloque la récompense au gagnant.
create or replace function public.declare_challenge_winner(p_challenge uuid, p_winner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges;
begin
  select * into c from public.challenges where id = p_challenge for update;
  if c.id is null then raise exception 'Défi introuvable'; end if;
  if c.creator_id <> auth.uid() then raise exception 'Seul le créateur peut déclarer le vainqueur'; end if;
  if c.status = 'closed' then raise exception 'Défi déjà clôturé'; end if;
  if not exists (select 1 from public.challenge_participants where challenge_id = p_challenge and user_id = p_winner) then
    raise exception 'Le vainqueur doit être un participant';
  end if;

  update public.challenges set status = 'closed', winner_id = p_winner where id = p_challenge;

  -- Récompense : déblocage temporaire de la fonctionnalité payante.
  insert into public.feature_unlocks (user_id, feature, until, source)
  values (p_winner, c.reward_feature, now() + make_interval(days => c.reward_days), 'challenge:' || p_challenge);

  -- Notification "Récompense Obtenue" (best-effort)
  begin
    insert into public.notifications (user_id, kind, title, body)
    values (p_winner, 'system', 'Récompense obtenue 🎁',
      c.reward_feature || ' débloqué pour ' || c.reward_days || ' jours (défi : ' || c.title || ')');
  exception when others then null; end;
end;$$;
revoke execute on function public.declare_challenge_winner(uuid, uuid) from anon;

-- ── Mes déblocages actifs (feature → date d'expiration max) ────
create or replace function public.my_active_unlocks()
returns table(feature text, until timestamptz)
language sql stable security definer set search_path = public as $$
  select feature, max(until) as until
  from public.feature_unlocks
  where user_id = auth.uid() and until > now()
  group by feature
  order by until desc;
$$;
revoke execute on function public.my_active_unlocks() from anon;
