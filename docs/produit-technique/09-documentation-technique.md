# FLEX — Documentation technique

> **Document 09 / Pôle Produit & Technique** · XOFIX Internationale · 2026-06-12
> *Architecture, stack, base de données et sécurité du code. Pour un CTO, un dev
> ou un investisseur technique.*

---

## 1. Vue d'ensemble

FLEX est une **Progressive Web App (PWA)** : une application web installable, qui
fonctionne hors-store, se met à jour instantanément et reste légère. Elle s'appuie
sur un **backend serverless managé (Supabase)** — pas de serveur à administrer.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   CLIENT (PWA, navigateur)  │        │       SUPABASE (backend)     │
│  React + Vite + TypeScript  │  HTTPS │  Postgres + RLS              │
│  Tailwind, Zustand, Router  │ <────> │  Auth (anonyme + email/pwd)  │
│  Service Worker (offline,   │  WSS   │  Realtime (WebSocket)        │
│  push, mise à jour)         │ <────> │  Storage (médias)            │
│  WebRTC (appels P2P)        │        │  Edge Functions (Deno)       │
└─────────────────────────────┘        └──────────────────────────────┘
        │                                         
        └── WebRTC P2P (audio/vidéo) ─── STUN/TURN ─── autre client
```

---

## 2. Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Langage | **TypeScript** | Typage fort, moins de bugs |
| UI | **React 18** | Composants |
| Build | **Vite 5** | Build rapide, code-splitting |
| Style | **Tailwind CSS 3** | Design system par tokens (thèmes via `--accent`) |
| État | **Zustand** | Store léger (auth, économie) |
| Routing | **React Router 6** | Navigation, pages en `lazy()` |
| Animations | **Framer Motion** | Transitions |
| Icônes | **lucide-react** | Pictos |
| Backend | **Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions) | Données, auth, temps réel |
| PWA | **vite-plugin-pwa (Workbox)** | Service worker, offline, push |
| Temps réel comm | **WebRTC** (P2P) | Appels audio/vidéo gratuits |
| Hébergement | **Vercel** | CDN mondial, déploiement |

**Coût de cette stack au lancement : quasi nul** (paliers gratuits Supabase + Vercel).

---

## 3. Fonctionnalités livrées (cartographie)

| Domaine | Fonctions |
|---------|-----------|
| **Social** | Flow public, profils réels, suivi/abonnés, likes, commentaires, partage, recherche (pseudo/numéro), traduction 1-clic, comptes privés |
| **Messagerie** | DM type WhatsApp, médias réels, **messages vocaux**, stickers, réactions, suppression, statuts/stories 24h |
| **Appels** | Audio/vidéo P2P gratuits, appels de groupe (mesh), historique, sonneries, **chat en appel**, **enregistrement d'appel** |
| **Création** | Studio (photo + filtres + recadrage, vidéo, audio enregistré, musique), caméra à filtres temps réel |
| **Économie** | Sparks, cadeaux, défis (Challenges), Arena, boutique/Market, Premium (essai 30j) |
| **Live & jeux** | Salon Live (Realtime), mini-jeux + classements, Otaku Sanctuary |
| **IA** | Agent compagnon (scaffold Edge Function LLM) |
| **Confiance** | Modération, dashboard admin, **galerie privée codée**, récupération de compte, notifications push, **badge d'icône**, rappels de fonctionnalités |
| **Sécurité** | RLS Postgres, verrous PIN, Ghost Mode (éphémère) |

---

## 4. Modèle de données (principales tables)

- `profiles` — identité (pseudo, nom, avatar, **téléphone**, bio, tier, score, privé, VIP).
- `flexes` — publications (contenu, média, son, PIN, compteurs).
- `flex_likes` — likes (jonction).
- `comments` — commentaires.
- `chat_messages` — messages (Squads + DM, médias, réactions, **vocaux**).
- `dm_threads` — fils de conversation privés.
- `stories` — statuts 24h.
- `follows` — graphe social.
- `notifications` — centre de notifications.
- `saved_media` — **galerie privée** (RLS self-only).
- `wallets` / économie — Sparks, transactions, défis, déblocages.
- `call_logs`, `pending_calls`, `call_rooms` — appels.
- `reports`, `blocked_accounts`, `app_admins` — modération & sécurité.

> Détail exhaustif et idempotent : `supabase/flex-master.sql` (+ migrations `phone.sql`, `gallery.sql`).

---

## 5. Sécurité du code (résumé — détail doc 11)

- **Row Level Security (RLS)** sur toutes les tables sensibles : un utilisateur ne lit/écrit que ce qu'il a le droit.
- **Aucun secret côté client** : pas de mot de passe ni clé privée dans le bundle. Les clés sensibles (service role, clés API LLM/push) vivent côté serveur (Edge Functions).
- **Admin** : identité Supabase + table `app_admins` (le verrou réel), pas un mot de passe en dur.
- **PIN** : empreintes SHA-256 salées, jamais en clair (publications, galerie).
- **Modération** : signalements, sanctions graduées, garde anti-injection.

---

## 6. Déploiement (CI/CD)

- **Hébergeur :** Vercel (CDN mondial, HTTPS auto).
- **Build :** `tsc -b && vite build` → 90+ chunks (pages en `lazy()`).
- **PWA :** service worker généré (Workbox), mise à jour « prompt » (toast nouvelle version).
- **Bonnes pratiques actuelles :** déployer via **build distant Vercel** (`vercel --prod`), pas en prebuilt (cf. note interne sur les variables d'env). Vérifier après déploiement que le bundle pointe vers la bonne URL Supabase.

---

## 7. Limites connues & dettes techniques

- **Appels :** WebRTC P2P nécessite les deux en ligne ; TURN gratuit (Metered) pour NAT strict (limites de débit à l'échelle). Chat/enregistrement d'appel : **1-à-1 seulement** (pas encore en appel de groupe).
- **Live vidéo :** non activé (Realtime seulement) — Agora prévu en phase 2.
- **Confidentialité au niveau post :** le feed reste public (privacy au niveau profil) — RLS post-level en v2.
- **Téléphone visible :** en v1 le numéro est lisible (comme WhatsApp) — table privée + RPC en v2.
- **Galerie « codée » :** verrou d'affichage (PIN local) ; chiffrement réel du stockage = v2.
- **IA & traduction :** dépendent de clés API serveur (budget) pour passer à l'échelle.
- **Bundle principal** > 500 Ko : à surveiller (déjà code-splitté ; optimisations possibles).

> La liste complète des améliorations est dans le **doc 12**, leurs coûts dans le **doc 13**.
