-- ═══════════════════════════════════════════════════════════════
--  FLEX — agents.sql  (ADDITIF, idempotent)
--  Écosystème « Mon IA » : un agent autoclonable par utilisateur.
--   • Clonage automatique à l'inscription (trigger sur profiles)
--   • Mémoire vectorielle (pgvector) — embeddings remplis plus tard par
--     l'Edge Function (le « cerveau » LLM, clé côté serveur)
--   • Évolution : chaque publication fait gagner de l'XP à l'agent
--   • RLS stricte : un agent n'est lisible/modifiable que par SON user
--  À exécuter dans Supabase → SQL Editor (après schema.sql / growth.sql).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists vector;

-- ── 1. Agent : 1 ligne par utilisateur ─────────────────────────
create table if not exists public.agents (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  name       text not null default 'Mon IA',
  level      int  not null default 1,
  xp         int  not null default 0,
  persona    jsonb not null default '{}'::jsonb,   -- style/ton appris de l'utilisateur
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. Mémoire vectorielle (court & long terme) ────────────────
-- La dimension (1536) doit correspondre au modèle d'embedding choisi
-- côté Edge Function (ex: OpenAI text-embedding-3-small = 1536).
create table if not exists public.agent_memories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'note',         -- post | interaction | note…
  content    text not null,
  embedding  vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists agent_mem_user_idx on public.agent_memories (user_id, created_at desc);
-- Recherche sémantique (cosine) quand les embeddings seront remplis.
create index if not exists agent_mem_vec_idx on public.agent_memories
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── 3. Clonage automatique à l'inscription ─────────────────────
create or replace function public.clone_agent_for_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.agents (user_id, name)
  values (new.id, 'IA de ' || coalesce(new.username, 'toi'))
  on conflict (user_id) do nothing;
  return new;
end;$$;

drop trigger if exists trg_clone_agent on public.profiles;
create trigger trg_clone_agent after insert on public.profiles
  for each row execute function public.clone_agent_for_profile();

-- Rattrapage : crée l'agent des profils déjà existants.
insert into public.agents (user_id, name)
select id, 'IA de ' || coalesce(username, 'toi') from public.profiles
on conflict (user_id) do nothing;

-- ── 4. Évolution : +10 XP par publication, niveau = 1 + xp/100 ──
create or replace function public.agent_gain_xp_on_flex()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.agents
     set xp         = xp + 10,
         level      = greatest(level, 1 + (xp + 10) / 100),
         updated_at = now()
   where user_id = new.author_id;
  return new;
end;$$;

drop trigger if exists trg_agent_xp_flex on public.flexes;
create trigger trg_agent_xp_flex after insert on public.flexes
  for each row execute function public.agent_gain_xp_on_flex();

-- ── 5. RLS : isolation stricte par user_id ─────────────────────
alter table public.agents         enable row level security;
alter table public.agent_memories enable row level security;

drop policy if exists "agent_select_owner" on public.agents;
create policy "agent_select_owner" on public.agents
  for select using (auth.uid() = user_id);

drop policy if exists "agent_update_owner" on public.agents;
create policy "agent_update_owner" on public.agents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agent_mem_select_owner" on public.agent_memories;
create policy "agent_mem_select_owner" on public.agent_memories
  for select using (auth.uid() = user_id);

drop policy if exists "agent_mem_insert_owner" on public.agent_memories;
create policy "agent_mem_insert_owner" on public.agent_memories
  for insert with check (auth.uid() = user_id);

-- Note : l'écriture des embeddings (UPDATE de la colonne vector) se fera
-- via l'Edge Function en service_role (contourne la RLS, côté serveur).
