-- ═══════════════════════════════════════════════════════════════
--  FLEX — studio.sql  (ADDITIF, idempotent)
--  Bucket de stockage pour les uploads utilisateur du Studio
--  (photos, audio). À exécuter dans Supabase → SQL Editor.
--
--  Aucune migration de la table `flexes` : les types de posts passent
--  par la convention `media_url` déjà en place :
--    • Mood  : media_url = 'gradient:violet' | 'gradient:cyan' | 'gradient:pink'
--    • Photo : media_url = URL publique de l'image uploadée
--    • Audio : media_url = URL publique du fichier audio (détecté par extension)
-- ═══════════════════════════════════════════════════════════════

-- Bucket public "media"
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Lecture publique des médias (feed visible par tous)
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
  on storage.objects for select
  using (bucket_id = 'media');

-- Upload réservé aux comptes authentifiés, et UNIQUEMENT dans leur dossier
-- (<user_id>/...) : un utilisateur ne peut pas écrire chez un autre.
drop policy if exists "media_auth_upload" on storage.objects;
create policy "media_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Un utilisateur peut supprimer ses propres médias.
drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
