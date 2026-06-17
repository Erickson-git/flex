-- ═══════════════════════════════════════════════════════════════
-- FLEX — Réponse / citation de message (façon WhatsApp)
-- Migration ADDITIVE et IDEMPOTENTE. (Déjà incluse dans flex-master.sql.)
-- ═══════════════════════════════════════════════════════════════

alter table public.chat_messages add column if not exists reply_to uuid;
-- Aperçu dénormalisé (« auteur : extrait ») → affichage sans jointure.
alter table public.chat_messages add column if not exists reply_preview text;
