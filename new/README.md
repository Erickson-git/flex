# 📦 FLEX — Apps mobiles installables (Android & iOS)

> Objectif : que FLEX soit **installable et fonctionne bien sur Android et iOS**,
> **gratuitement**, **via git/GitHub**, et **sans Mac**.

FLEX est déjà une **PWA** (app web installable). On la transforme en vraies
apps natives avec **Capacitor** (gratuit, open-source) et on les **construit sur
les serveurs GitHub (GitHub Actions, gratuit)** — donc aucun Mac ni PC puissant
n'est nécessaire.

```
new/
├── README.md      ← ce fichier (vue d'ensemble)
├── android/       ← guide pour l'APK Android installable (GRATUIT, fonctionne)
└── ios/           ← guide pour iPhone (PWA gratuite + voie App Store)
```

> Les **projets natifs** (`android/` et `ios/`) sont générés automatiquement à la
> racine du repo par Capacitor (`npx cap add …`) — ce dossier `new/` est le
> **centre de commande** : il documente et pilote chaque plateforme.

---

## Les 3 fichiers déjà en place pour toi
- `capacitor.config.ts` (racine) — identité de l'app (`com.xofix.flex`, FLEX).
- `.github/workflows/build-android.yml` — construit l'**APK** sur GitHub (gratuit).
- `.github/workflows/build-ios.yml` — construit l'**iOS** sur GitHub macOS (gratuit).
- `package.json` — scripts `android:add`, `ios:add`, `mobile:sync`, `mobile:icons`.

---

## Résumé express

| Plateforme | Gratuit ? | Sans Mac ? | Résultat |
|-----------|-----------|------------|----------|
| **Android (APK)** | ✅ oui | ✅ oui | APK installable (GitHub Actions ou PWABuilder) |
| **iPhone (PWA)** | ✅ oui | ✅ oui | Installé via « Ajouter à l'écran d'accueil » |
| **iPhone (App Store)** | ❌ 99 $/an Apple | ✅ build sur CI macOS | App native (signature requise) |

➡️ Détails : **`android/README.md`** et **`ios/README.md`**.

## Avant tout : prérequis (une seule fois)
1. Avoir le projet sur **GitHub** (déjà le cas, c'est un repo git).
2. Dans **GitHub → Settings → Secrets and variables → Actions**, ajouter :
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_USERNAME`.
3. (Local, optionnel) `npm install` pour récupérer Capacitor.

> ⚠️ Le wrapper natif charge l'app **packagée** (dossier `dist`). Après chaque
> changement, relance la build web + `npx cap sync` (script `npm run mobile:sync`).
