-- ═══════════════════════════════════════════════════════════════
-- FLEX — Découverte par numéro de téléphone (carnet d'adresses)
-- "Ceux qui ont ton numéro te retrouvent sur FLEX."
-- Migration ADDITIVE et IDEMPOTENTE. À exécuter dans le SQL Editor Supabase.
-- (Déjà incluse dans flex-master.sql — ce fichier permet de l'appliquer seul.)
-- ═══════════════════════════════════════════════════════════════

-- Nécessite la colonne profiles.phone (cf. phone.sql / flex-master.sql).

create or replace function public.find_contacts_on_flex(p_digits text[])
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.phone is not null
    and p.id <> auth.uid()
    and exists (
      select 1
      from unnest(p_digits) d
      where length(regexp_replace(d, '\D', '', 'g')) >= 6
        and (
          -- correspondance complète (chiffres seuls)…
          regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(d, '\D', '', 'g')
          -- …ou sur les 8 derniers chiffres (tolère l'indicatif pays manquant)
          or right(regexp_replace(p.phone, '\D', '', 'g'), 8)
             = right(regexp_replace(d, '\D', '', 'g'), 8)
        )
    );
$$;

revoke all on function public.find_contacts_on_flex(text[]) from public;
grant execute on function public.find_contacts_on_flex(text[]) to authenticated, anon;
