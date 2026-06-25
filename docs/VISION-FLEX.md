# 🏛️ Vision & Architecture de FLEX

> Document de référence (roadmap produit). Source : vision fondateur, 2026-06-25.
> Coche les cases au fur et à mesure. Voir aussi `docs/00-INDEX.md`.

## 1. Identity & Security (La Forteresse)
- Inscription rapide : pseudo + scan facial (clé biométrique).
- Récupération de compte : double clé (scan facial + mot de passe/email lié).
- **Flex-Stealth (mode furtif)** : anonymat total, ID sériel (ex. `A001B12`) invisible des autres.
- Sécurité extrême : E2EE, architecture Zero-Trust, aucun fonds Bitcoin stocké sur les serveurs FLEX.

## 2. Social & Engagement (le cœur)
- Feed dynamique : reco personnalisée (rétention, intérêts, moments de la journée).
- **Flex-Pulse** : espace « Actualités » type X, fil de débats.
- **Flex-Connect** : roulette de rencontres aléatoires / speed-networking pro par domaine.
- **Flex-Lock** : contenus (vidéos 2h+, images) verrouillés par code privé + demandes d'accès.

## 3. Communication & Productivité
- Messagerie type WhatsApp (temps réel, appels audio/vidéo).
- **Flex-Meet** : appels avec partage d'écran natif (pro/réunions).
- **Flex-Cinema** : visionnage synchronisé (films/mangas) + commentaires intégrés.

## 4. E-commerce & Pro (Flex-Shop & Flex-Academy)
- Templates par métier : sites web instantanés (boutique e-commerce, cabinet médical, portfolio, blog).
- **Flex-Academy** : cours en ligne (playlists, quiz, certifications).
- **Flex-Book** : prise de rendez-vous (liable à Google Calendar).

## 5. Finance & Connexion
- **Flex-Wallet** : portefeuille Bitcoin non-custodial (P2P, trading).
- **Social Bridge** : profil centralisant les comptes externes (TikTok, Instagram, WhatsApp, GitHub…).

## 6. Expérience Utilisateur (Accessibilité)
- **Magic Link** : accès immédiat via lien, sans mot de passe initial.
- **Guest Mode** : invités par lien (appel ou publication), avec numérotation des invités.
- Multi-plateforme : PC, Android, iOS.
- Astuce iOS : tutoriel « Ajouter à l'écran d'accueil » (PWA) en attendant l'App Store.

## 7. Fact-Checking & Modération (sans IA)
- Badges de fiabilité (Vérifié / En cours / Douteux) attribués **manuellement**.
- Validation humaine : dashboard admin pour certifier les informations.
- _(Note : l'IA a été retirée de FLEX — plus de composant « Mon IA » ni de Détective-FLEX automatique.)_

---

## 🚀 To-Do de lancement
- [ ] **Setup Supabase** : base (Users, Posts, Shops, Courses, Wallet).
- [ ] **Flex-Onboarding** : flux Pseudo + Scan Facial.
- [ ] **Magic Link** : authentification par lien (supprimer les mots de passe).
- [ ] **Interface Builder** : composants de sites (templates boutiques/blogs).
- [ ] **WebRTC** : moteur appels + partage d'écran.
- [ ] **Module Bitcoin** : API portefeuille pour transactions P2P.
- [ ] **Déploiement PWA** : installable navigateur (Android, PC, iPhone).

---

## 📌 État actuel (déjà en place dans le code, 2026-06-25)
- ✅ Messagerie temps réel **style WhatsApp** (répondre/citer, modifier, supprimer, accusés ✓/✓✓, recherche, épingler, archiver, messages éphémères).
- ✅ Auth **biométrique** (Face ID / WebAuthn) + connexion classique.
- ✅ **Mot de passe optionnel** à l'inscription (pseudo seul requis) → proche du « Magic Link / no-password ».
- ✅ Statut **Pionnier** auto (100 premiers) + rareté/urgence.
- ✅ **PWA** installable (Android/PC/iPhone) + apps Capacitor + APK GitHub Release.
- ✅ Économie **Sparks** : achat (premium) + **retrait en FCFA** (mobile money Moov/Flooz).
- ✅ Espaces privés (**Hideouts** / Flex-Lock embryon), Arena, Market, Squads/Watchparty (proche **Flex-Cinema**).
- ✅ Dashboard **admin** (modération, signalements, paiements, retraits).

## 🔭 Grands chantiers restants (par effort croissant estimé)
1. **Flex-Stealth** (mode furtif + ID sériel) — extension du profil/auth existants.
2. **Flex-Pulse** (fil débats type X) — variante du feed actuel.
3. **Flex-Connect** (roulette/speed-networking) — WebRTC requis.
4. **Flex-Meet** (partage d'écran) — WebRTC.
5. **Flex-Academy / Flex-Book** (cours, RDV, Google Calendar).
6. **Flex-Shop Builder** (templates de sites par métier).
7. **Flex-Wallet** (Bitcoin non-custodial) — le plus lourd (sécurité/réglementaire).
