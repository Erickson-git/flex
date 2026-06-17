# Prompt Lovable — construire des améliorations pour FLEX

> Colle le bloc ci-dessous dans Lovable. Remplis la section **AMÉLIORATION
> DEMANDÉE** à la fin avec ce que tu veux ajouter. (Astuce : connecte Lovable à
> ton dépôt GitHub `Erickson-git/flex` pour qu'il travaille sur le vrai code.)

---

```
Tu es un développeur senior qui travaille sur FLEX, un réseau social mobile déjà
existant (édité par XOFIX Internationale, cible Afrique de l'Ouest). Tu dois
AJOUTER une amélioration en respectant EXACTEMENT l'architecture, le design et les
règles ci-dessous. Ne reconstruis pas l'app : intègre-toi à l'existant.

=== STACK TECHNIQUE (ne pas changer) ===
- Frontend : React 18 + TypeScript + Vite. PWA installable (vite-plugin-pwa).
- Style : Tailwind CSS. État : Zustand. Routing : react-router-dom (pages en lazy()).
- Animations : framer-motion. Icônes : lucide-react.
- Backend : Supabase (Auth, Postgres + Row Level Security, Realtime, Storage,
  Edge Functions Deno). Temps réel : Supabase Realtime. Appels : WebRTC P2P.
- Alias d'import : "@/..." = "src/...".

=== ORGANISATION DU CODE (respecter) ===
- Composants réutilisables : src/components/*.tsx
- Écrans/pages : src/pages/*.tsx
- Logique & accès données : src/lib/*.ts  (un fichier par domaine)
- Migrations SQL : supabase/*.sql (IDEMPOTENTES : "create table if not exists",
  "drop policy if exists" avant "create policy", etc.)
- Commentaires en FRANÇAIS, concis.

=== DESIGN SYSTEM (impératif — look "boîte de nuit luxueuse", sombre & or) ===
- Fond sombre (couleurs "ink": ink-900 #050505, ink-800, ink-700).
- Accent OR THÉMABLE piloté par la variable CSS --accent (triplet RGB). Utilise
  les classes : text-gold, bg-gold-grad, text-gold-grad, shadow-glow,
  ring-gold/30. NE PAS coder une couleur or en dur → toujours via ces classes.
- Couleurs secondaires néon : flex-pink (#ff4d8d), flex-violet (#8b5cf6),
  flex-cyan (#22d3ee).
- Composants verre : classe .glass (bordure fine, fond translucide, backdrop-blur).
- Boutons principaux : .btn-gold. Champs : .input-luxe.
- Coins arrondis généreux (rounded-2xl / rounded-3xl). Mobile-first.
- Supporte le MODE JOUR/NUIT (html[data-mode='day']) et 13 thèmes : n'utilise
  que les tokens ci-dessus pour rester compatible automatiquement.
- UI 100 % en FRANÇAIS, ton jeune et premium. Micro-animations soignées.

=== RÈGLES DE SÉCURITÉ (non négociables) ===
- AUCUN secret côté client (pas de service_role, pas de clé API privée, pas de
  mot de passe en dur). Seule la clé "anon/publishable" Supabase est côté client.
- TOUTE table Supabase a la Row Level Security activée + policies adaptées
  (un utilisateur ne lit/écrit que ce qu'il a le droit).
- Données sensibles côté serveur uniquement (Edge Functions).
- Pas de faux comptes ni de fausse hype.

=== CONTRAINTES PRODUIT ===
- Public : téléphones d'entrée de gamme, bande passante faible → compresser les
  images côté client, rester léger, pagination des listes.
- Budget faible : privilégier les solutions gratuites/open-source ; n'introduire
  un service tiers payant que si indispensable (et le signaler).
- Économie interne "Sparks" (monnaie virtuelle), paiements via mobile money.

=== CE QUI EXISTE DÉJÀ (ne pas recréer) ===
Auth (pseudo + mot de passe, email/téléphone optionnels, connexion au visage
WebAuthn), fil "Flow" personnalisé, messagerie (DM, vocaux, stickers, réactions,
stories 24h), appels audio/vidéo P2P + chat/enregistrement en appel, Studio
(photo/vidéo/audio, filtres), galerie privée chiffrée par code, défis, live,
mini-jeux, Premium, modération + dashboard admin, notifications push, 13 thèmes,
mode jour/nuit, PWA + APK Android.

=== CE QUE TU DOIS LIVRER POUR L'AMÉLIORATION ===
1. Le(s) composant(s)/page(s) React + TypeScript, dans la bonne arborescence.
2. La logique dans src/lib si besoin (accès Supabase typé).
3. La migration SQL idempotente (table + RLS) si une donnée est nécessaire.
4. Le câblage (route, bouton d'accès, état) pour que ce soit utilisable.
5. Respecte le design system ci-dessus et le typage strict (build "tsc" propre).
6. Explique en 3 lignes comment tester.

=== AMÉLIORATION DEMANDÉE ===
👉 [DÉCRIS ICI, précisément, l'amélioration ou la fonctionnalité à construire.
   Exemple : "Ajoute un système de sondages dans les publications : l'auteur peut
   créer un sondage à 2-4 options, les autres votent une fois, et on voit les %
   en temps réel."]
```

---

## Conseils d'utilisation
1. **1 amélioration à la fois** : Lovable est plus fiable avec une demande claire et bornée.
2. **Sois précis** dans la section « AMÉLIORATION DEMANDÉE » (quoi, qui peut faire quoi, à quoi ça ressemble).
3. Quand Lovable a produit le code, **donne-le-moi** : je l'intègre proprement dans ton repo, je vérifie la sécurité (RLS), le build, et je déploie.
4. Pour que Lovable édite le VRAI code : dans Lovable, **connecte ton GitHub** (`Erickson-git/flex`).
