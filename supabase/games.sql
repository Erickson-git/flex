-- ═══════════════════════════════════════════════════════════════
--  FLEX — games.sql  (ADDITIF, idempotent)
--  Pôle Gaming : scores + leaderboard (meilleur score par joueur).
--  Multijoueur temps réel : via Supabase Realtime (canaux), pas de table
--  dédiée nécessaire pour le matchmaking léger.
--  À exécuter dans Supabase → SQL Editor (après schema.sql).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.game_scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game       text not null,
  score      int  not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index if not exists game_scores_idx on public.game_scores (game, score desc);

alter table public.game_scores enable row level security;

-- Chacun n'insère QUE ses propres scores.
drop policy if exists "gs_insert_own" on public.game_scores;
create policy "gs_insert_own" on public.game_scores
  for insert to authenticated with check (auth.uid() = user_id);

-- Lecture publique (classement visible par tous).
drop policy if exists "gs_select_all" on public.game_scores;
create policy "gs_select_all" on public.game_scores
  for select using (true);

-- Classement : meilleur score par joueur pour un jeu donné.
create or replace function public.game_leaderboard(p_game text, p_limit int default 20)
returns table(user_id uuid, username text, avatar_url text, best int)
language sql stable security definer set search_path = public as $$
  select gs.user_id, p.username, p.avatar_url, max(gs.score) as best
  from public.game_scores gs
  join public.profiles p on p.id = gs.user_id
  where gs.game = p_game
  group by gs.user_id, p.username, p.avatar_url
  order by best desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;
