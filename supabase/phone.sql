-- ═══════════════════════════════════════════════════════════════
-- FLEX — Numéro de téléphone à l'inscription + recherche par numéro
-- Migration ADDITIVE et IDEMPOTENTE. À exécuter dans le SQL Editor Supabase.
-- (Déjà incluse dans flex-master.sql — ce fichier permet de l'appliquer seul.)
-- ═══════════════════════════════════════════════════════════════

-- Colonne téléphone (texte libre : conserve le format saisi, ex. +228...).
alter table public.profiles add column if not exists phone text;

-- Index pour accélérer la recherche par numéro.
create index if not exists profiles_phone_idx on public.profiles (phone);

-- NB sécurité/vie privée :
--   La RLS `profiles_read` rend les profils publiquement lisibles (recherche
--   côté client). Le téléphone devient donc VISIBLE des autres utilisateurs.
--   Si tu ne veux PAS exposer le numéro en clair, deux options (chantier v2) :
--     1) déplacer `phone` dans une table privée `profile_private` (RLS self-only)
--        et faire la recherche par numéro via une RPC `security definer` qui ne
--        renvoie que le profil (jamais le numéro) ;
--     2) stocker un hash du numéro pour la recherche par correspondance exacte.
--   La v1 ci-dessus privilégie la simplicité (numéro visible, comme WhatsApp).
