-- ═══════════════════════════════════════════════════════════════
-- FLEX — Schéma Supabase (Postgres)
-- À coller dans : Supabase Dashboard → SQL Editor → New query → Run
-- Active aussi l'auth anonyme : Authentication → Providers → Anonymous
-- ═══════════════════════════════════════════════════════════════

-- ── Compteur global d'inscriptions (pour le rang Pionnier) ──────
create table if not exists public.signup_counter (
  id int primary key default 1,
  total int not null default 0
);
insert into public.signup_counter (id, total) values (1, 0)
  on conflict (id) do nothing;

-- ── Profils ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  tier text not null default 'member' check (tier in ('pioneer','founder','member')),
  joined_rank int not null,
  followers_count int not null default 0,
  following_count int not null default 0,
  flex_score int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Flexes (posts du fil public) ────────────────────────────────
create table if not exists public.flexes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  media_url text,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists flexes_created_idx on public.flexes (created_at desc);

-- ── Likes / "Flex" ──────────────────────────────────────────────
create table if not exists public.flex_likes (
  flex_id uuid not null references public.flexes(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (flex_id, user_id)
);

-- ── Chat temps réel (Squads + Directs partagent la même table) ──
-- room_id : "sq_*" pour un Squad, "dm_*" pour un Direct.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  content text not null default '',
  media_url text,
  reaction text,
  created_at timestamptz not null default now()
);
create index if not exists chat_room_idx on public.chat_messages (room_id, created_at);

-- ── Hideouts + messages éphémères ───────────────────────────────
create table if not exists public.secret_messages (
  id uuid primary key default gen_random_uuid(),
  hideout_id text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists secret_hideout_idx on public.secret_messages (hideout_id, created_at);

-- ═══════════════════════════════════════════════════════════════
-- FONCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Revendication atomique d'un pseudo : incrémente le compteur,
-- calcule le rang + le tier, crée le profil. Renvoie le profil.
create or replace function public.claim_username(p_username text, p_display_name text)
returns public.profiles
language plpgsql
security definer
as $$
declare
  v_rank int;
  v_tier text;
  v_profile public.profiles;
begin
  update public.signup_counter set total = total + 1 where id = 1
    returning total into v_rank;

  v_tier := case
    when v_rank <= 100 then 'pioneer'
    when v_rank <= 1000 then 'founder'
    else 'member'
  end;

  insert into public.profiles (id, username, display_name, joined_rank, tier, following_count)
  values (auth.uid(), lower(p_username), coalesce(nullif(p_display_name,''), p_username), v_rank, v_tier, 0)
  returning * into v_profile;

  -- Crée le portefeuille + Sparks de départ (fonctions définies dans economy.sql).
  begin
    perform public.award_sparks(auth.uid(), 30, 'welcome');
  exception when undefined_function then
    null; -- economy.sql pas encore exécuté : on ignore
  end;

  return v_profile;
end;
$$;

-- Maintien des compteurs de likes
create or replace function public.bump_like() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.flexes set likes_count = likes_count + 1 where id = new.flex_id;
    update public.profiles p set flex_score = flex_score + 10
      from public.flexes f where f.id = new.flex_id and p.id = f.author_id;
  elsif tg_op = 'DELETE' then
    update public.flexes set likes_count = greatest(0, likes_count - 1) where id = old.flex_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_bump_like on public.flex_likes;
create trigger trg_bump_like after insert or delete on public.flex_likes
  for each row execute function public.bump_like();

-- Purge des messages expirés (à appeler via un cron Supabase, ou au fetch)
create or replace function public.purge_expired() returns void language sql as $$
  delete from public.secret_messages where expires_at < now();
$$;

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.flexes enable row level security;
alter table public.flex_likes enable row level security;
alter table public.chat_messages enable row level security;
alter table public.secret_messages enable row level security;

-- Profils : lecture publique, écriture limitée à soi
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

-- Flexes : lecture publique, création/suppression par l'auteur
create policy "flexes_read" on public.flexes for select using (true);
create policy "flexes_insert_self" on public.flexes for insert with check (auth.uid() = author_id);
create policy "flexes_delete_self" on public.flexes for delete using (auth.uid() = author_id);

-- Likes : lecture publique, gérés par l'utilisateur connecté
create policy "likes_read" on public.flex_likes for select using (true);
create policy "likes_insert_self" on public.flex_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_self" on public.flex_likes for delete using (auth.uid() = user_id);

-- Messages secrets : visibles uniquement s'ils ne sont pas expirés ;
-- insertion par l'auteur uniquement. (À durcir selon ta logique de salons.)
create policy "secret_read_live" on public.secret_messages for select using (expires_at > now());
create policy "secret_insert_self" on public.secret_messages for insert with check (auth.uid() = author_id);

-- Chat : lecture publique (les salons sont ouverts), insertion par l'auteur.
-- (Pour des Squads privés, ajoute une table d'appartenance + un check ici.)
create policy "chat_read" on public.chat_messages for select using (true);
create policy "chat_insert_self" on public.chat_messages for insert with check (auth.uid() = author_id);

-- ── Realtime (fil + salons en direct) ───────────────────────────
alter publication supabase_realtime add table public.flexes;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.secret_messages;
