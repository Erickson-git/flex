# ✦ FLEX

> **Brille en public. Libère-toi en privé.**
> Le réseau social du Flex — une PWA installable, mode sombre luxueux,
> pensée pour l'hyper-engagement dès le premier utilisateur.

FLEX combine deux mondes :

- **Le Flex Flow** — un fil public ultra-stylisé (lifestyle, popularité) où chaque
  like (« Flex ») déclenche une micro-récompense visuelle et haptique.
- **The Hideouts** — un espace privé verrouillé par code, avec messages
  **éphémères** qui s'autodétruisent. Le jardin secret de chacun.

Le tout est servi avec un onboarding mystérieux, un **statut Pionnier** attribué
automatiquement aux 100 premiers inscrits (rareté), et un fil déjà vivant
(« effet boîte de nuit pleine ») même quand la communauté démarre à zéro.

---

## 🧱 Stack

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** (thème noir & or sur-mesure)
- **Framer Motion** (micro-animations, micro-récompenses)
- **Supabase** (auth anonyme, base temps réel, RLS) — _optionnel grâce au mode démo_
- **vite-plugin-pwa** (installable + offline)

---

## 🚀 Démarrage en 60 secondes (mode démo, sans backend)

```bash
npm install
cp .env.example .env      # VITE_DEMO_MODE reste à "true"
npm run dev
```

Ouvre http://localhost:5173 → tout fonctionne **immédiatement** avec des
données factices et un stockage local. Idéal pour tester / faire la démo.

---

## 🔌 Brancher Supabase (mode production)

1. Crée un projet gratuit sur https://supabase.com.
2. **SQL Editor → New query** → colle **tout `supabase/setup.sql`** (un seul
   copier-coller : il concatène déjà les 6 scripts dans le bon ordre) → **Run**.
   <br>_Alternative manuelle, même ordre :_ `schema.sql` → `economy.sql` →
   `arena.sql` → `growth.sql` → `social.sql` → `otaku.sql`.
3. **Authentication → Providers → Anonymous** → active-le.
   Puis **Storage → New bucket** `receipts` (privé) pour les reçus de paiement.
   Enfin, ajoute ton `user_id` dans la table `app_admins` pour l'accès admin.
4. **Project Settings → API** → copie `Project URL` et `anon public key`.
5. Renseigne `.env` :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_DEMO_MODE=false

# Monétisation locale (numéro de réception Moov/Flooz — gardé en .env, jamais commité)
VITE_PAYMENT_MOOV_NUMBER=96966676
# Pseudo autorisé sur /flesh-admin-dashboard
VITE_ADMIN_USERNAME=ton_pseudo
```

6. `npm run dev` — l'app tape maintenant Supabase (auth, fil temps réel, profils).

> Le code bascule tout seul entre démo et Supabase : aucune autre modif requise.

---

## 📱 Installer la PWA sur smartphone

1. Déploie (voir plus bas) ou expose ton `npm run dev` (ex. via le réseau local).
2. Ouvre l'URL dans **Safari (iOS)** ou **Chrome (Android)**.
3. **Partager → « Sur l'écran d'accueil »** (iOS) / **menu ⋮ → « Installer »** (Android).
4. FLEX s'ouvre en plein écran, comme une vraie app.

> Icône : l'app utilise le **logo officiel** `public/logo.jpg` (éclair néon doré)
> comme icône d'écran d'accueil, splash et favicon. Déjà configuré dans le manifest.

---

## ☁️ Déploiement gratuit

### Option A — Vercel (recommandé, 1 commande)

```bash
npm i -g vercel
vercel              # suivre les questions, puis :
vercel --prod
```

Dans le dashboard Vercel → **Settings → Environment Variables**, ajoute
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEMO_MODE`,
`VITE_PAYMENT_MOOV_NUMBER`, `VITE_ADMIN_USERNAME`.
Le fichier `vercel.json` gère déjà le routage SPA.

### Option B — Render (Static Site)

- **Build Command** : `npm run build`
- **Publish Directory** : `dist`
- **Rewrite Rule** : `/*` → `/index.html` (type _Rewrite_)
- Ajoute les mêmes variables d'environnement.

### Option C — Netlify

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

(Ajoute un `_redirects` contenant `/*  /index.html  200` si besoin.)

---

## 🗂️ Architecture

```
src/
├─ lib/
│  ├─ types.ts        # modèle de données partagé
│  ├─ supabase.ts     # client + détection mode démo
│  ├─ api.ts          # API unifiée (Supabase ⇄ démo localStorage)
│  ├─ demoData.ts     # "illusion de densité" — fil pré-rempli
│  └─ utils.ts        # tier/rang, haptique, formats, validation pseudo
├─ store/useAuth.ts   # état d'auth global (zustand)
├─ components/
│  ├─ Avatar, PioneerBadge, LiveTicker
│  ├─ FlexReaction    # bouton "Flex" + particules (micro-récompense)
│  ├─ FlexCard        # carte de post
│  ├─ BottomNav       # navigation + CTA central de création
│  ├─ HideoutLock     # verrou à code des Hideouts
│  └─ EphemeralMessage# bulle éphémère + compte à rebours
├─ pages/
│  ├─ Onboarding      # accueil mystérieux
│  ├─ ClaimUsername   # revendication du pseudo (urgence + rareté)
│  ├─ Welcome         # bienvenue personnalisée (statut Pionnier)
│  ├─ FlexFlow        # fil public
│  ├─ Compose         # publier un Flex
│  ├─ Hideouts        # espace privé + chat éphémère
│  └─ Profile         # vitrine du statut
└─ App.tsx            # routage + gardes d'accès
supabase/schema.sql   # tables, RLS, RPC claim_username, triggers
```

## 🧠 Leviers d'engagement implémentés

| Levier | Où |
| --- | --- |
| Statut Pionnier / Fondateur auto | `utils.tierFromRank`, `PioneerBadge`, `claim_username` (SQL) |
| Rareté & urgence (places limitées) | `ClaimUsername` (compteur + dispo en direct) |
| Bienvenue exclusive personnalisée | `Welcome` |
| Micro-récompenses (pop, particules, vibration) | `FlexReaction`, `haptic()` |
| Illusion de densité / activité live | `demoData`, `LiveTicker`, tri `flowScore` |
| Dualisme public / secret | `FlexFlow` vs `Hideouts` |
| Éphémère (rareté temporelle) | `EphemeralMessage`, `sendSecretMessage(ttl)` |

---

## 🔒 Note responsabilité

The Hideouts est un espace **privé** (code local + messages éphémères), conçu
comme une protection de la vie privée — au même titre que les messages qui
disparaissent sur Signal/Snapchat. Ajoute tes propres CGU et un contrôle d'âge
avant toute mise en production publique.

---

Fait avec ✦ pour démarrer fort.
