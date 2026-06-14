-- ═══════════════════════════════════════════════════════════════
--  FLEX — social_graph.sql  (ADDITIF, idempotent)
--  Système de suivi (follow) + confidentialité (profil public/privé).
--  Le feed global reste public ; la confidentialité s'applique au
--  niveau du PROFIL (un compte privé est verrouillé pour les non-abonnés).
-- ═══════════════════════════════════════════════════════════════

-- Confidentialité : profil public (défaut) ou privé.
alter table public.profiles add column if not exists is_private boolean not null default false;

-- ── Suivi ──────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
drop policy if exists "follows_read" on public.follows;
create policy "follows_read" on public.follows for select using (true);
drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows for delete using (auth.uid() = follower_id);

-- Compteurs dénormalisés (followers_count / following_count)
create or replace function public.bump_follow() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  end if;
  return null;
end;$$;
drop trigger if exists trg_follow on public.follows;
create trigger trg_follow after insert or delete on public.follows
  for each row execute function public.bump_follow();
