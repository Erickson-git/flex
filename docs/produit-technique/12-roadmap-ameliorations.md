# FLEX — Roadmap & liste de TOUTES les améliorations

> **Document 12 / Pôle Produit & Technique** · XOFIX Internationale · 2026-06-12
> *La liste complète des améliorations à faire + les nouvelles fonctionnalités à
> ajouter pour satisfaire tous les utilisateurs de réseaux sociaux du monde.*
> Priorités : 🔴 critique · 🟠 important · 🟢 confort/croissance.

---

## A. Améliorations des fonctionnalités existantes

### Inscription & comptes
- 🟠 Réinitialisation du mot de passe (email de récupération) et « mot de passe oublié ».
- 🟠 Vérification du numéro par **OTP SMS** (anti-faux comptes).
- 🟢 Connexion par numéro de téléphone (en plus de l'email).
- 🟢 Connexion sociale (Google) optionnelle.

### Messagerie
- 🟠 Accusés de lecture / « en train d'écrire… » / présence en ligne.
- 🟠 Messages vocaux : forme d'onde + vitesse de lecture (x1.5/x2).
- 🟢 Réponse à un message (citation), transfert, épingler, recherche dans la conversation.
- 🟢 Messages éphémères, édition de message.
- 🟢 Chiffrement de bout en bout des DM (v2).

### Appels
- 🔴 **Chat + enregistrement en appel de GROUPE** (déjà fait en 1-à-1).
- 🟠 Partage d'écran, lever la main, salle d'attente (admit-only) en groupe.
- 🟠 Fournisseur TURN payant fiable (réseaux mobiles / NAT strict).
- 🟢 Sous-titres/transcription d'appel (IA), filtres beauté en appel.

### Publications & feed
- 🟠 **Algorithme de feed** personnalisé (intérêts, rétention) au-delà du chrono.
- 🟠 Confidentialité au niveau du post (RLS) — pas seulement du profil.
- 🟢 Carrousels multi-médias, sondages, GIF, mentions @, hashtags cliquables.
- 🟢 Brouillons, programmation de publication, collections/favoris.

### Galerie privée
- 🟠 Chiffrement réel du stockage (URLs signées + RPC), pas seulement un PIN d'affichage.
- 🟢 Albums/dossiers, recherche, tri, sélection multiple, partage depuis la galerie.

### Profil
- 🟢 Profil vérifié (badge), liens externes, épingler des publications, statistiques créateur.

### Recherche & découverte
- 🟠 Recherche full-text (publications, hashtags) + tendances.
- 🟢 Suggestions « comptes à suivre », contacts du téléphone (avec consentement).

---

## B. Nouvelles fonctionnalités à ajouter (pour rivaliser avec les meilleurs)

### Création & contenu (style TikTok/Insta)
- 🔴 **Vidéo verticale courte (Reels)** + éditeur (coupe, musique, texte, stickers).
- 🟠 **Live vidéo** (Agora) branché sur la couche Realtime déjà construite.
- 🟠 Filtres/AR avancés (MediaPipe gratuit → DeepAR premium), effets de visage.
- 🟢 Duos/collabs, remix, templates de contenu.

### Social & communauté
- 🟠 Pages/Communautés publiques, événements, watch-parties (Manga Clans existants).
- 🟢 Groupes de discussion à grande échelle, rôles & modération communautaire.
- 🟢 « Close friends », listes, co-auteurs de publication.

### Économie créateur (différenciateur clé)
- 🔴 **Retrait Sparks → FCFA** fluide (mobile money) pour les créateurs.
- 🟠 Abonnements à un créateur, pourboires, contenus payants, cadeaux en live.
- 🟠 Tableau de bord créateur (revenus, audience, paiements).
- 🟢 Place de marché (Market) enrichie : services, billets, produits.

### Monétisation plateforme
- 🟠 **Premium** réellement « gaté » (fonctions exclusives, sans pub, boosts).
- 🟠 Boost/Spotlight payant, pub native locale ciblée.

### IA
- 🟠 Cerveau LLM des agents déployé (assistant, suggestions de contenu, légendes).
- 🟢 Modération assistée par IA, traduction à l'échelle (Edge Function), anti-arnaque.

### Confiance & sûreté
- 🟠 Signalement enrichi, blocage, mots interdits, contrôle parental.
- 🟢 Centre de sécurité utilisateur, transparence des sanctions.

### International
- 🟢 Multilingue (i18n) complet, formats locaux, multi-devise à terme.

---

## C. Améliorations techniques (dette & qualité)
- 🟠 Tests automatisés (unitaires + e2e) et CI.
- 🟠 Monitoring (Sentry), alertes, analytics produit (rétention, entonnoirs).
- 🟠 Pagination partout, optimisation du bundle, préchargement intelligent.
- 🟢 Accessibilité (a11y), audit Lighthouse, mode hors-ligne avancé.
- 🟢 Documentation développeur + environnement de test/staging.

---

## D. Ordre recommandé (du plus rentable au plus tard)

**Sprint lancement (avant ouverture officielle)** 🔴
1. Réinitialisation mot de passe + OTP SMS inscription.
2. Retrait Sparks → FCFA (mobile money) + tableau de bord créateur basique.
3. Algorithme de feed v1 + recherche full-text.
4. Monitoring + analytics + sauvegardes testées.

**Sprint traction (mois 1-6)** 🟠
5. Reels (vidéo courte) + éditeur.
6. Live vidéo (Agora) + cadeaux en live.
7. Premium réellement gaté + boosts payants.
8. Chat/enregistrement en appel de groupe + partage d'écran.
9. Accusés de lecture, réponses, présence (messagerie).

**Sprint échelle (mois 6-18)** 🟢
10. IA (agents, modération, traduction à l'échelle).
11. Filtres AR premium, chiffrement E2E des DM, galerie chiffrée.
12. Communautés/pages, multilingue, place de marché enrichie.

> Le **budget** de ces chantiers est détaillé dans le **doc 13**.
