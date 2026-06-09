# 🏛️ FLEX — Architecture de l'écosystème

> Maître d'œuvre : document de référence. Décrit le **pourquoi** des choix.
> Pour l'installation/déploiement, voir `README.md`.

## 1. Stratégie « 1 codebase, 3 surfaces »

FLEX ne se découpe **pas** en trois projets séparés (ce serait du gaspillage et
une dette de maintenance pour une V1). C'est **une seule PWA React/Vite** qui
sert trois surfaces depuis le même code, parfaitement synchronisées via Supabase :

| Surface | Accès | Implémentation |
| --- | --- | --- |
| **App mobile** (cible principale) | PWA installable (écran d'accueil) | layout mobile-first `max-w-lg`, gestes/taps, haptique, `100dvh` |
| **App web** | navigateur desktop | **même code, responsive** : colonne centrée + ambiance premium (`@media ≥1024px`) |
| **Dashboard admin** | route secrète `/flesh-admin-dashboard` | `AdminDashboard.tsx`, gardé par `isAdmin()` + RPC `is_admin()` |

Avantages : une seule source de vérité, zéro désynchronisation, temps réel
partagé (Supabase Realtime), et un coût d'infra nul sur le plan gratuit.

## 2. Couches du front

```
src/
├─ lib/         # logique métier pure (api, economy, arena, social, otaku, premium…)
│               # → bascule automatique Supabase ⇄ MODE DÉMO (localStorage)
├─ store/       # état global (zustand) : useAuth, useEconomy
├─ components/  # UI réutilisable (cartes, badges, chat, animations…)
├─ pages/       # écrans (Flow, Squads, Arena, Directs, Profile, Admin…)
└─ App.tsx      # routage + gardes d'accès (Protected / PublicOnly)
```

Règle d'or : **les pages ne parlent jamais à Supabase directement**. Elles
passent par `lib/*` qui encapsule la double implémentation (démo / prod). On peut
ainsi démontrer l'app sans backend, puis brancher Supabase en changeant une
variable d'env — sans toucher l'UI.

## 3. Sécurité (séparation stricte des privilèges)

- **Clé publique uniquement côté client** (`VITE_SUPABASE_ANON_KEY`). La
  `service_role` n'entre jamais dans le bundle (jamais préfixée `VITE_`).
- **RLS activée sur TOUTES les tables** (`supabase/setup.sql`). Lecture selon la
  visibilité, **écriture réservée à l'auteur** (`auth.uid()`).
- **Mutations sensibles = fonctions `security definer` atomiques** avec verrous
  de ligne (`SELECT … FOR UPDATE`) : transferts de Sparks, achats marché, paris
  d'Arène, validation de paiements. Impossible de dupliquer des points ou de
  double-dépenser. Le client n'a que des droits de **lecture** sur les wallets.
- **Admin** : liste blanche `app_admins` + `is_admin()` côté SQL ; la route admin
  est inopérante pour un non-admin même si l'URL est connue.

## 4. Scalabilité (anticipation montée en charge)

- **Index** sur tous les accès chauds : fil par récence, posts par auteur,
  messages par room, wallets par solde, commandes par statut, follows inversés
  (`supabase/growth.sql`).
- **Compteurs dénormalisés** (likes/commentaires/followers) maintenus par
  triggers → pas de `COUNT(*)` coûteux à la lecture.
- **Realtime ciblé** : on s'abonne avec un `filter` (`room_id=eq.X`,
  `id=eq.match`), jamais à une table entière → bande passante maîtrisée.
- **Tri du flux** (`flowScore`) calculé côté client sur un `LIMIT` borné.

## 5. Backend SQL (ordre d'exécution)

Un seul copier-coller : **`supabase/setup.sql`** (concatène les 6 modules) :
`schema → economy → arena → growth → social → otaku`.
Puis : activer **Anonymous auth**, créer le bucket privé `receipts`, s'ajouter
dans `app_admins`.

## 6. Modèle d'authentification (Option 1 retenue)

Inscription **ultra-rapide sans friction** : `signInAnonymously()` + RPC
`claim_username` (attribution atomique du rang/tier). Pas d'email, pas de mot de
passe → conversion maximale. Le profil est enrichi ensuite (Sparks, titres,
thèmes, musique).

---

_FLEX est conçu pour démarrer plein (illusion de densité), sécurisé par défaut,
et prêt à encaisser la croissance sans refonte._
