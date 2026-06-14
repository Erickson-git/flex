# FLEX — Prompt complet du projet

> **Document 17 / Pôle Conseils** · 2026-06-12
> *La description maîtresse du projet. À donner à un développeur, une IA, un
> designer ou un nouvel arrivant pour qu'il comprenne TOUT FLEX d'un coup, ou
> pour reconstruire le projet de zéro.*

---

## Prompt maître (à copier-coller)

```
Tu travailles sur FLEX, le réseau social mobile édité par XOFIX Internationale
(Lomé, Togo), destiné à l'Afrique de l'Ouest puis au monde.

VISION
FLEX est un "super-app social" tout-en-un, léger, sécurisé, avec une monnaie
sociale locale (les Sparks) et le mobile money intégrés. Cible : jeunesse
ouest-africaine, téléphones d'entrée de gamme, faible bande passante. Objectif :
devenir LE réseau social panafricain de référence où les créateurs gagnent leur vie.

SLOGAN
"Le réseau social du Flex — Brille en public, libère-toi en privé."
Baseline : Freedom · Party · Show-biz.

STACK TECHNIQUE
- Frontend : PWA installable. React 18 + TypeScript + Vite. Tailwind CSS (thèmes
  pilotés par une variable CSS --accent). Zustand (état). React Router (pages en
  lazy()). Framer Motion. lucide-react (icônes).
- Backend : Supabase (Postgres + Row Level Security, Auth anonyme + email/mot de
  passe, Realtime, Storage, Edge Functions Deno). SQL idempotent dans
  supabase/flex-master.sql (+ migrations phone.sql, gallery.sql).
- Temps réel : WebRTC P2P pour les appels audio/vidéo gratuits (STUN + TURN).
  Supabase Realtime pour chat live, présence, signalisation d'appel, notifications.
- Hébergement : Vercel (CDN). PWA via vite-plugin-pwa (service worker, push, MAJ).

PRINCIPES NON NÉGOCIABLES
1. On ne fait JAMAIS confiance au client : tout ce qui est sensible est protégé
   côté serveur (RLS Postgres + Edge Functions). Aucun secret/clé/mot de passe
   dans le bundle. L'accès admin = identité Supabase + table app_admins, jamais
   un mot de passe codé en dur.
2. Pas de fausse hype, pas de faux comptes, pas d'usurpation de personnes réelles.
3. Modération conservée : signalements + sanctions graduées + dashboard admin.
4. Léger et accessible : images compressées côté client, code-splitting, offline.
5. Vie privée respectée ; verrous PIN (empreinte SHA-256 salée, jamais en clair).

FONCTIONNALITÉS (livrées)
- Social : Flow public, profils réels, suivi/abonnés, likes, commentaires, partage,
  recherche par pseudo ou numéro, traduction 1-clic, comptes privés.
- Inscription : pseudo + email + téléphone + mot de passe ; compte invité possible.
- Messagerie (type WhatsApp) : DM, médias réels, MESSAGES VOCAUX, stickers,
  réactions, suppression, statuts/stories 24h.
- Appels : audio/vidéo P2P gratuits, appels de groupe (mesh), historique, sonneries,
  CHAT EN APPEL et ENREGISTREMENT D'APPEL (1-à-1).
- Création (Studio) : photo (filtres + recadrage), vidéo, audio enregistré, musique
  sur publication, caméra à filtres temps réel.
- Économie : Sparks, cadeaux, défis (Challenges), Arena, Market, Premium (essai 30j).
- Live & jeux : salon Live (Realtime), mini-jeux + classements, Otaku Sanctuary.
- IA : agent compagnon (Edge Function LLM, scaffold).
- Confiance : modération, dashboard admin, GALERIE PRIVÉE CODÉE (PIN), récupération
  de compte, notifications push, badge de comptage sur l'icône, rappels automatiques
  des fonctionnalités, téléchargement des publications/médias reçus vers la galerie.

ÉCONOMIE (modèle)
Cycle : FCFA (mobile money) → achat de Sparks → dépense in-app (cadeaux, boosts,
défis, déblocages) → revenu créateur → retrait en FCFA. FLEX prend une marge à
chaque étape + abonnement Premium + commissions + boosts + pub locale + B2B.

CONTRAINTES MARCHÉ
Low-budget au lancement (stack 0€/paliers gratuits). Audience Lomé / Afrique de
l'Ouest. Mobile money natif. La vidéo lourde passe par un tiers (Agora) seulement
en phase 2 ; la couche sociale reste sur Supabase Realtime (quasi gratuit).

STYLE DE TRAVAIL ATTENDU
Construire une brique solide à la fois : build vert (tsc + vite) → déployer →
vérifier HTTP 200. SQL idempotent. Dégradation propre si un module manque. Code
qui ressemble au code existant (mêmes conventions, commentaires en français).

ÉTAT ACTUEL
Produit en production, déployé sur Vercel. Reste : lancement officiel, acquisition,
montée en charge, et les améliorations priorisées (voir roadmap). Documentation
complète du projet dans le dossier docs/.
```

---

## Comment utiliser ce prompt
- **Briefer un développeur / une IA** : colle le bloc ci-dessus en introduction.
- **Reconstruire de zéro** : ce prompt + `docs/09-documentation-technique.md` + `supabase/flex-master.sql` suffisent à recréer l'architecture.
- **Onboarder un nouvel arrivant** : prompt + `docs/00-INDEX.md` pour naviguer.

---

## Variantes courtes

**Pitch 1 phrase :**
> FLEX, le super-app social africain (édité par XOFIX Internationale) : réseau +
> messagerie + appels gratuits + économie créateur en mobile money, léger et sécurisé.

**Pitch 30 secondes :**
> FLEX est le réseau social mobile de la jeunesse ouest-africaine : on y partage son
> flex, on chat et on appelle gratuitement, on joue, et on gagne/dépense une monnaie
> locale (les Sparks) reliée au mobile money. Léger, sécurisé, conçu pour l'Afrique —
> là où les réseaux mondiaux ne le sont pas. Produit déjà en production ; on lève
> pour le lancement officiel et la croissance.
```
