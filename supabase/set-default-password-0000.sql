-- ═══════════════════════════════════════════════════════════════
-- FLEX — Mot de passe par défaut « 0000 » pour les comptes EXISTANTS
-- À exécuter UNE FOIS dans Supabase → SQL Editor → Run.
-- pgcrypto (crypt/gen_salt) est déjà disponible sur Supabase.
--
-- ⚠️ Fais une sauvegarde avant (Database → Backups) : on modifie les
--    identifiants. Teste ensuite la connexion d'UN compte (pseudo + 0000).
-- ═══════════════════════════════════════════════════════════════

-- 1) Les comptes SANS email (anciens comptes anonymes) reçoivent un email
--    interne « pseudo@flex.app » → ils pourront se connecter par pseudo + 0000.
--    On ne TOUCHE PAS aux emails déjà renseignés (récupération préservée).
update auth.users u
set email = lower(p.username) || '@flex.app',
    email_confirmed_at = coalesce(u.email_confirmed_at, now())
from public.profiles p
where p.id = u.id
  and (u.email is null or u.email = '');

-- 2a) RECOMMANDÉ — option A : « 0000 » pour TOUS les comptes (écrase l'existant).
--     ⚠️ Les utilisateurs qui avaient choisi leur propre mot de passe devront
--        désormais utiliser 0000.
update auth.users
set encrypted_password = crypt('0000', gen_salt('bf')),
    updated_at = now();

-- 2b) VARIANTE PRUDENTE — option B : ne met 0000 QUE sur les comptes qui n'ont
--     aucun mot de passe (ne déloge personne). Pour l'utiliser : commente le
--     bloc 2a ci-dessus et décommente celui-ci.
-- update auth.users
-- set encrypted_password = crypt('0000', gen_salt('bf')), updated_at = now()
-- where encrypted_password is null or encrypted_password = '';
