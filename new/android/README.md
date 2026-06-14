# 🤖 FLEX — APK Android installable (gratuit, sans Mac)

Deux méthodes **100 % gratuites**. La **A** est la plus simple, la **B** te donne
le contrôle total (et permet le Play Store ensuite).

---

## ✅ Méthode A — PWABuilder (la plus simple, ~5 min)

> Idéal pour avoir un APK installable tout de suite, sans rien installer.

1. Déploie FLEX (il l'est déjà : `https://flex-komi-erics-projects.vercel.app`).
2. Va sur **https://www.pwabuilder.com** → colle l'URL → **Start**.
3. Onglet **Android** → **Generate Package** → télécharge le `.zip`.
4. Dedans : un **APK** (test) + un **AAB** (Play Store). Installe l'APK sur ton
   téléphone (active « Sources inconnues »).
5. (Play Store) Crée un compte **Google Play Developer** (25 $ une seule fois)
   et envoie l'AAB. *(Le téléchargement de l'APK, lui, est gratuit.)*

PWABuilder gère aussi le fichier **assetlinks.json** (à héberger sur ton domaine
pour que l'app s'ouvre en plein écran sans barre du navigateur — TWA).

---

## ✅ Méthode B — Capacitor + GitHub Actions (contrôle total, gratuit)

> L'APK est construit **sur les serveurs GitHub** (runner Ubuntu) → aucun Mac/PC
> puissant requis. Tout est déjà préparé dans le repo.

### 1) Générer le projet Android (une fois)
En local (ou laisse le workflow le faire automatiquement) :
```bash
npm install
npm run build
npm run android:add      # crée le dossier android/ (projet natif)
npm run mobile:sync      # copie l'app web dedans
```

### 2) Construire l'APK sur GitHub (gratuit)
1. Pousse le code sur GitHub.
2. **Le plus simple — pousse un tag** : `git tag v1.0.0 && git push origin v1.0.0`.
   → la build se lance, crée une **Release** et y attache **`flex.apk`**.
   → le bouton « Télécharger l'APK » de l'app fonctionne alors **tout seul**
     (URL stable `…/releases/latest/download/flex.apk`).
3. (Ou) Onglet **Actions** → **« Build Android APK »** → **Run workflow** → télécharge
   l'artefact **`flex-android-apk`**.
4. Installe l'APK sur ton téléphone (« Sources inconnues »).

> Pour une version **signée Play Store**, pousse plutôt un tag `release-1.0.0`
> (workflow Méthode C) : il publie une Release avec `flex.apk` signé + `flex.aab`.

> Le fichier de build est déjà là : `.github/workflows/build-android.yml`.
> Pense à mettre tes secrets `VITE_*` dans GitHub (voir `new/README.md`).

### 3) Icônes & splash (gratuit)
Place une grande image (≥ 1024×1024) puis :
```bash
npm run mobile:icons     # génère icônes + écrans de démarrage
npm run mobile:sync
```

---

## ✅ Méthode C — APK + AAB SIGNÉS pour le Play Store (gratuit, prêt)

> Le workflow **`.github/workflows/build-android-release.yml`** construit et
> **signe** automatiquement un **APK** (installation directe) ET un **AAB**
> (à envoyer au Play Store). Tout est gratuit sauf l'inscription Play (25 $ une fois).

### 1) Créer ton keystore (une seule fois, garde-le précieusement !)
```bash
keytool -genkey -v -keystore flex.keystore -alias flex -keyalg RSA -keysize 2048 -validity 10000
```
> ⚠️ Si tu PERDS ce keystore, tu ne pourras plus mettre à jour ton app sur le
> Play Store. Sauvegarde-le hors du repo (ne le commit JAMAIS).

### 2) L'encoder en base64 (pour le mettre en secret)
```bash
# Linux / Mac / Git Bash :
base64 -w0 flex.keystore > flex.keystore.b64
# Windows (cmd) :
certutil -encode flex.keystore flex.keystore.b64
```

### 3) Ajouter les Secrets GitHub (Settings → Secrets → Actions)
- `ANDROID_KEYSTORE_BASE64` = contenu de `flex.keystore.b64`
- `ANDROID_KEYSTORE_PASSWORD` = mot de passe du keystore
- `ANDROID_KEY_ALIAS` = `flex`
- `ANDROID_KEY_PASSWORD` = mot de passe de la clé
- (+ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_USERNAME`)

### 4) Lancer la build signée
- Onglet **Actions** → **« Build Android SIGNÉ (Play Store) »** → **Run workflow**
  *(ou pousse un tag `release-1.0.0`)*.
- Récupère **`flex-android-apk-signe`** (à installer/partager) et
  **`flex-android-aab-playstore`** (à envoyer sur le Play Console).

### 5) Publier sur le Play Store
1. Compte **Google Play Developer** (25 $, une seule fois).
2. Play Console → crée l'app → **Production** → envoie l'**AAB signé**.
3. Remplis la fiche (icône = ton logo, captures, description) → soumets.

---

## Bien FONCTIONNER sur Android (à vérifier)
- **Notifications push** : déjà gérées (Web Push). En APK natif, on peut ajouter
  `@capacitor/push-notifications` (FCP) plus tard pour des push natives.
- **Appels (caméra/micro)** : Capacitor demande les permissions natives — elles
  sont déclarées par les plugins. Vérifie l'autorisation au 1er appel.
- **Stockage / mode hors-ligne** : le service worker PWA continue de fonctionner.
- Teste : inscription, feed, chat, appel, galerie, thèmes/mode jour-nuit.
