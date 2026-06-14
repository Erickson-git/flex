-- ═══════════════════════════════════════════════════════════════
-- FLEX — Galerie privée (médias enregistrés par l'utilisateur)
-- Migration ADDITIVE et IDEMPOTENTE. À exécuter dans le SQL Editor Supabase.
-- (Déjà incluse dans flex-master.sql — ce fichier permet de l'appliquer seul.)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.saved_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  url text not null,
  kind text not null default 'image' check (kind in ('image','video','audio','other')),
  source text,                                   -- ex. « Publication de @x », « Message de @y », « Appel »
  created_at timestamptz not null default now()
);
create index if not exists saved_media_user_idx on public.saved_media (user_id, created_at desc);

alter table public.saved_media enable row level security;

-- RLS : un utilisateur ne voit / n'ajoute / ne supprime QUE ses propres médias.
drop policy if exists saved_media_self on public.saved_media;
create policy saved_media_self on public.saved_media
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
