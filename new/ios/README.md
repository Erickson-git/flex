# 🍎 FLEX — iPhone (gratuit immédiat + voie App Store)

> ⚠️ **La vérité, sans détour :** installer une app sur un **vrai iPhone** ou la
> publier sur l'**App Store** exige un **compte Apple Developer (99 $/an)** et une
> **signature** — ça, ce n'est **pas** gratuit, et Apple l'impose (même sans Mac).
>
> MAIS : tu peux offrir FLEX sur iPhone **gratuitement, dès maintenant**, et faire
> compiler l'app iOS **sans Mac**. Voici les deux voies.

---

## ✅ Voie 1 — PWA « Ajouter à l'écran d'accueil » (GRATUIT, marche tout de suite)

Sur iPhone, une PWA s'installe comme une vraie app (icône, plein écran,
notifications iOS 16.4+). C'est **déjà intégré dans FLEX** (carte « Télécharger
l'application » + guide d'installation dans le profil).

L'utilisateur iPhone :
1. Ouvre FLEX dans **Safari**.
2. Bouton **Partager** → **« Sur l'écran d'accueil »** → **Ajouter**.
3. L'icône FLEX apparaît — l'app s'ouvre en plein écran.

👉 **C'est la voie 100 % gratuite recommandée** tant que tu n'as pas de compte
Apple Developer. Aucune limite de fonctionnalités majeures pour un réseau social.

---

## 🛠️ Voie 2 — App native iOS via GitHub Actions (build gratuite, sans Mac)

Le projet est prêt : `.github/workflows/build-ios.yml` compile l'app iOS sur un
**runner macOS GitHub (gratuit)** — tu n'as **pas besoin de Mac**.

### Générer le projet iOS (une fois)
```bash
npm install
npm run build
npm run ios:add        # crée ios/ (projet Xcode)
npm run mobile:sync
```

### Compiler sur GitHub
- Onglet **Actions** → **« Build iOS (gratuit, sans Mac) »** → **Run workflow**.
- Ça **vérifie que l'app compile** pour iPhone (build simulateur, **non signée**).

> ❗ Cette build **ne s'installe pas** sur un iPhone réel : iOS refuse toute app
> non signée. Pour aller plus loin → voie 3.

### Voie 3 — Installer sur iPhone / App Store (nécessite Apple Developer)
1. Crée un **compte Apple Developer** (99 $/an).
2. Génère **certificat** + **provisioning profile** ; mets-les en **Secrets GitHub**.
3. Adapte le workflow : `xcodebuild archive` + `exportArchive` avec signature
   (action `apple-actions/import-codesign-certs`). Tu obtiens un **.ipa**.
4. Distribution **gratuite hors App Store** possible via **TestFlight** (inclus
   dans le compte Developer) → jusqu'à 10 000 testeurs, sans frais en plus.

---

## Récap décision

| Tu veux… | Fais… | Coût |
|----------|-------|------|
| iPhone tout de suite | PWA « écran d'accueil » | **0 €** |
| Tester l'app native | Workflow iOS GitHub | **0 €** (non installable sur device) |
| Installer sur iPhone réel | Apple Developer + signature | 99 $/an |
| Publier sur l'App Store | Apple Developer + envoi | 99 $/an |

> Conseil : **lance sur Android (APK gratuit) + PWA iPhone** maintenant ; prends
> le compte Apple Developer **quand les revenus le justifient** (cf. doc coûts).
