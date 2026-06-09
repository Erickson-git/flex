-- ═══════════════════════════════════════════════════════════════
--  FLEX — Initialisation propre & professionnelle (PostgreSQL / Supabase)
--  Région : Europe (Francfort).
--
--  Architecture sociale standard, prête à l'emploi :
--   profiles (liés à auth.users via trigger)  ·  posts  ·  post_likes
--   comments  ·  follows  +  RLS stricte  +  compteurs auto  +  index.
--
--  → À coller tel quel dans : Dashboard Supabase → SQL Editor → Run.
--
--  NB : ce script est une BASELINE auth-native (email/OAuth). Si tu veux la
--  pile FLEX complète (Sparks, Arena, Squads, etc.), utilise plutôt
--  `supabase/setup.sql`. N'exécute pas les DEUX : ils définissent tous deux
--  une table `profiles` et entreraient en conflit. Choisis-en un.
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────
create extension if not exists citext with schema extensions;      -- pseudo insensible à la casse

-- ── Enums ───────────────────────────────────────────────────────
do $$ begin
  create type public.post_visibility as enum ('public', 'followers', 'private');
exception when duplicate_object then null; end $$;

-- ═══════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════

-- ── Profils (1-1 avec auth.users) ───────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext unique not null,
  display_name  text not null default '',
  avatar_url    text,
  bio           text check (char_length(bio) <= 280),
  website       text,
  is_verified   boolean not null default false,
  followers_count int not null default 0,
  following_count int not null default 0,
  posts_count   int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_\.]{3,20}$')
);

-- ── Publications ────────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  content       text not null default '' check (char_length(content) <= 2000),
  media_url     text,
  visibility    public.post_visibility not null default 'public',
  like_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint post_not_empty check (char_length(content) > 0 or media_url is not null)
);
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ── Likes ───────────────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists likes_user_idx on public.post_likes (user_id);

-- ── Commentaires ────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ── Relations de suivi ──────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

-- ═══════════════════════════════════════════════════════════════
--  TRIGGERS & FONCTIONS
-- ═══════════════════════════════════════════════════════════════

-- 1) Création automatique du profil à l'inscription (auth.users → profiles).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username citext;
begin
  -- pseudo issu des metadata, sinon dérivé de l'email, sinon généré.
  v_username := lower(coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user_' || left(replace(new.id::text, '-', ''), 8)
  ));
  -- garantit l'unicité même en cas de collision (suffixe court).
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || left(replace(new.id::text, '-', ''), 4);
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    left(regexp_replace(v_username, '[^a-z0-9_\.]', '', 'g'), 20),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', v_username),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) updated_at automatique.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_posts_updated on public.posts;
create trigger trg_posts_updated before update on public.posts
  for each row execute function public.set_updated_at();

-- 3) Compteurs dénormalisés (likes / commentaires / posts / follows).
create or replace function public.bump_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;$$;
drop trigger if exists trg_like on public.post_likes;
create trigger trg_like after insert or delete on public.post_likes
  for each row execute function public.bump_like();

create or replace function public.bump_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  else
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end;$$;
drop trigger if exists trg_comment on public.comments;
create trigger trg_comment after insert or delete on public.comments
  for each row execute function public.bump_comment();

create or replace function public.bump_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  else
    update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
  end if;
  return null;
end;$$;
drop trigger if exists trg_post on public.posts;
create trigger trg_post after insert or delete on public.posts
  for each row execute function public.bump_post();

create or replace function public.bump_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  else
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
  end if;
  return null;
end;$$;
drop trigger if exists trg_follow on public.follows;
create trigger trg_follow after insert or delete on public.follows
  for each row execute function public.bump_follow();

-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY  (séparation stricte des privilèges)
--  Règle d'or : lecture selon la visibilité ; écriture réservée à l'auteur.
-- ═══════════════════════════════════════════════════════════════
alter table public.profiles  enable row level security;
alter table public.posts     enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments  enable row level security;
alter table public.follows   enable row level security;

-- Helper : l'utilisateur courant suit-il l'auteur ?
create or replace function public.is_following(p_target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = p_target
  );
$$;

-- ── PROFILES ────────────────────────────────────────────────────
create policy "profiles_select_all"   on public.profiles for select using (true);
create policy "profiles_insert_self"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── POSTS : lecture selon visibilité, écriture = auteur ─────────
create policy "posts_select_visible" on public.posts for select using (
  visibility = 'public'
  or author_id = auth.uid()
  or (visibility = 'followers' and public.is_following(author_id))
);
create policy "posts_insert_self" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update_self" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "posts_delete_self" on public.posts for delete using (auth.uid() = author_id);

-- ── LIKES : lecture publique, (dé)like par soi-même ─────────────
create policy "likes_select_all"  on public.post_likes for select using (true);
create policy "likes_insert_self" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_self" on public.post_likes for delete using (auth.uid() = user_id);

-- ── COMMENTS : lecture connectée, écriture = auteur ─────────────
create policy "comments_select_auth" on public.comments for select using (auth.role() = 'authenticated');
create policy "comments_insert_self" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete_self" on public.comments for delete using (auth.uid() = author_id);

-- ── FOLLOWS : lecture publique, gérés par le follower ───────────
create policy "follows_select_all"  on public.follows for select using (true);
create policy "follows_insert_self" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_self" on public.follows for delete using (auth.uid() = follower_id);

-- ═══════════════════════════════════════════════════════════════
--  REALTIME (optionnel : fil & interactions en direct)
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.comments;

-- ═══════════════════════════════════════════════════════════════
--  Fin. RLS active partout, service_role non requise côté client.
-- ═══════════════════════════════════════════════════════════════
