-- ═══════════════════════════════════════════════════════════════
-- FLEX — Messages éphémères (disparition automatique, façon WhatsApp)
-- Migration ADDITIVE et IDEMPOTENTE. (Déjà incluse dans flex-master.sql.)
-- ═══════════════════════════════════════════════════════════════

-- Date d'expiration : le message est masqué (et nettoyable) après cette date.
alter table public.chat_messages add column if not exists expires_at timestamptz;
create index if not exists chat_expires_idx on public.chat_messages (expires_at);
