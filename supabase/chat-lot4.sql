-- ═══════════════════════════════════════════════════════════════
-- FLEX — Chat Lot 4 : modifier un message + « message supprimé »
-- Migration ADDITIVE et IDEMPOTENTE. (Déjà incluse dans flex-master.sql.)
-- ═══════════════════════════════════════════════════════════════

alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists deleted boolean not null default false;

-- Modifier le texte d'un message (auteur uniquement).
create or replace function public.edit_message(p_id uuid, p_content text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.chat_messages
     set content = p_content, edited_at = now()
   where id = p_id and author_id = auth.uid();
end $$;

-- « Supprimer pour tout le monde » → laisse une trace « message supprimé ».
create or replace function public.tombstone_message(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.chat_messages
     set content = '', media_url = null, reaction = null, deleted = true
   where id = p_id and author_id = auth.uid();
end $$;

revoke all on function public.edit_message(uuid, text) from public;
grant execute on function public.edit_message(uuid, text) to authenticated;
revoke all on function public.tombstone_message(uuid) from public;
grant execute on function public.tombstone_message(uuid) to authenticated;
