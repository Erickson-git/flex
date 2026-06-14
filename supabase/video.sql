-- ═══════════════════════════════════════════════════════════════
-- FLEX — Vidéo longue découpée en segments (joués à la chaîne)
-- Migration ADDITIVE et IDEMPOTENTE. À exécuter dans le SQL Editor Supabase.
-- (Déjà incluse dans flex-master.sql — ce fichier permet de l'appliquer seul.)
-- ═══════════════════════════════════════════════════════════════

-- Liste ordonnée d'URLs de segments vidéo (≤ 1 min chacun). NULL = vidéo simple.
alter table public.flexes add column if not exists media_urls jsonb;
