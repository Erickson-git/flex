# FLEX — Guide de l'administrateur

> XOFIX Internationale · 2026-06-12
> *Tout ce que l'admin (et les modérateurs) doivent savoir pour piloter FLEX au
> quotidien : valider les paiements, modérer, sanctionner, surveiller la santé.*

---

## 1. Qu'est-ce que le panneau Admin

Le **back-office FLEX** est accessible à l'adresse **`/flesh-admin-dashboard`** (titre « Flesh · Admin »). Il permet de :

- **Valider ou rejeter les paiements** Premium / recharges Sparks (avec preuve/reçu).
- **Modérer les signalements** (inspecter le contenu, traiter, ignorer, **sanctionner**).
- **Suivre les métriques** clés (utilisateurs, inscriptions, paiements en attente, comptes bloqués).
- **Lire le journal d'activité** (événements de sécurité).
- **Modérer directement un utilisateur** par pseudo ou numéro (recherche → sanction).

---

## 2. Accès & sécurité (à lire en premier)

### 2.1 Comment devenir admin
1. Crée le compte **`komi`** via l'inscription normale de l'app (le mot de passe est haché par Supabase, jamais stocké en clair).
2. La variable `VITE_ADMIN_USERNAME=komi` (sur Vercel) ouvre le panneau quand tu es connecté en `komi` (garde côté interface `isAdmin`).
3. **Verrou réel = base de données (RLS).** Les actions admin (valider un paiement, sanctionner…) passent par Supabase. Il faut insérer l'`user_id` de `komi` dans la table **`app_admins`**, sinon les actions échouent même si le panneau s'affiche.

### 2.2 Règles de sécurité NON négociables
- ❌ **Ne JAMAIS coder le mot de passe admin en dur** dans l'app. FLEX est un site statique : tout `password === '...'` ou toute variable `VITE_*` est **lisible** par n'importe qui dans le navigateur.
- ✅ Le vrai contrôle d'accès = **identité Supabase + RLS `app_admins`**.
- 🔑 Si tu as utilisé un **jeton d'accès personnel (PAT) Supabase** pour configurer la base, **révoque-le** une fois fini.
- 👥 Donne un accès admin à **un nombre minimal de personnes** de confiance.

---

## 3. Mise en service (une seule fois)

À exécuter dans le **SQL Editor** de Supabase (sinon le panneau dégrade : bandeau « Outils avancés inactifs ») :

| Étape | Action | Pourquoi |
|-------|--------|----------|
| 1 | Exécuter **`supabase/flex-master.sql`** (idempotent) | Crée toute la base (profils, paiements, signalements, galerie, etc.) |
| 2 | Exécuter **`supabase/admin_tools.sql`** | Active **métriques, sanctions, journal** + corrige une faille (bannissement) |
| 3 | Insérer `komi` dans **`app_admins`** | Autorise réellement les actions admin (RLS) |
| 4 | Créer le **bucket Storage `receipts`** (privé) | Stocke les reçus de paiement à examiner |
| 5 | Vérifier le bucket `media` (public) | Avatars, photos, vidéos, **galerie**, enregistrements d'appel |

> ⚠️ Tant que `admin_tools.sql` n'est pas exécuté, les **sanctions, métriques avancées et le journal** sont désactivés (dégradation propre, pas de plantage).

---

## 4. Tâches quotidiennes de l'admin

### 4.1 Valider les paiements (priorité n°1)
Section **« Paiements à valider »**. Pour chaque demande :
1. **Regarde le reçu** (capture mobile money) affiché.
2. **Vérifie la cohérence** : nom, montant en FCFA, opérateur (provider), produit acheté, récompense en Sparks (`+X ✦`), éventuel statut VIP.
3. **Valider ✅** (crédite les Sparks / active le VIP) ou **Rejeter ❌** (paiement douteux / reçu illisible).

**Signaux de fraude à refuser :**
- Reçu flou, rogné, ou réutilisé (même référence vue plusieurs fois).
- Montant qui ne correspond pas au produit.
- Capture manifestement éditée.
- Même utilisateur qui multiplie les demandes suspectes.

### 4.2 Traiter les signalements
Section **« Signalements »**. Pour chaque signalement :
1. **Inspecter** : déplie le contenu signalé (texte / média / pseudo de l'auteur).
2. Décider :
   - **Traiter** (le signalement est fondé, action prise) ;
   - **Ignorer** (faux positif, RAS) ;
   - **Sanctionner** l'auteur (voir §5) — nécessite d'avoir **inspecté** d'abord pour identifier l'auteur.

### 4.3 Surveiller les métriques
Tuiles en haut : **Utilisateurs**, **Inscrits 24 h / 7 j**, **Paiements en attente**, **Signalements ouverts**, **Comptes bloqués**. Un pic anormal (inscriptions, signalements) = à investiguer.

### 4.4 Lire le journal d'activité
Liste des événements récents (gris = info, or = avertissement, rose = critique). Sert d'audit : qui a été sanctionné, tentatives suspectes, etc.

### 4.5 Modérer directement un utilisateur
Section **« Recherche & modération »** : recherche un compte par **pseudo ou numéro**, puis applique une sanction sans attendre un signalement (utile sur signalement externe / WhatsApp).

---

## 5. Les sanctions (échelle)

| Sanction | Effet | Quand l'utiliser |
|----------|-------|------------------|
| **Avertir** | Notifie l'utilisateur, pas de blocage | 1re infraction légère |
| **Bloquer 24 h** | Suspension temporaire | Récidive / contenu limite |
| **Bloquer 7 j** | Suspension longue | Comportement nuisible répété |
| **Bannir** (perma) | Compte bloqué définitivement | Arnaque, contenu illégal, harcèlement grave |

**Principe de proportionnalité :** commence bas (avertir), monte en cas de récidive. Garde une trace (le journal le fait automatiquement). Réserve le **bannissement** aux cas graves ou répétés.

---

## 6. Éthique & lignes rouges (valeurs FLEX)

- 🚫 **Pas de faux comptes, fausse hype, ni usurpation** de personnes réelles.
- 🔒 **Respect de la vie privée** : n'ouvre pas de contenus privés sans motif de modération ; ne partage jamais les données d'un utilisateur.
- ⚖️ **Impartialité** : pas de favoritisme. Mêmes règles pour tous.
- 💬 **Transparence** : en cas de sanction lourde, l'utilisateur est notifié.
- 💳 **Anti-fraude paiements** : en cas de doute, refuse et demande un meilleur reçu.

---

## 7. Dépannage (FAQ admin)

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| « Accès réservé » alors que je suis `komi` | Pas connecté en `komi` / `VITE_ADMIN_USERNAME` absent | Se connecter avec le bon pseudo ; vérifier la variable Vercel |
| Bandeau « Outils avancés inactifs » | `admin_tools.sql` non exécuté | L'exécuter dans le SQL Editor |
| Les actions échouent (valider/sanctionner) | `komi` absent de `app_admins` (RLS) | Insérer son `user_id` dans `app_admins` |
| « Reçu indisponible » | Bucket `receipts` manquant / privé mal configuré | Créer le bucket + policies |
| Métriques à 0 | Outils avancés inactifs ou base non initialisée | Réexécuter `flex-master.sql` puis `admin_tools.sql` |

---

## 8. Bonnes pratiques pour le staff de modération

1. **Traiter les paiements vite** (la confiance = la vitesse de crédit).
2. **Documenter** les décisions limites (capture + raison).
3. **Escalader** au responsable les cas ambigus (arnaque organisée, contenu illégal).
4. **Ne jamais** demander le mot de passe d'un utilisateur ni se faire passer pour lui.
5. **Tourner** la surveillance (matin / soir) pour ne rien laisser traîner > 24 h.

> Voir aussi : [Conseils au fondateur & au staff](conseils/16-conseils-fondateur-et-staff.md) et [Sécurité](produit-technique/11-securite.md).
