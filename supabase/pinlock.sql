-- ═══════════════════════════════════════════════════════════════
--  FLEX — pinlock.sql  (ADDITIF, idempotent)
--  Verrou par code PIN (FLEX Lite) : un Flex peut être verrouillé.
--  pin_hash = empreinte SHA-256 du code (le PIN n'est jamais stocké en clair).
-- ═══════════════════════════════════════════════════════════════

alter table public.flexes add column if not exists pin_hash text;
