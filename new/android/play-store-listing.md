# 🛒 FLEX — Fiche Google Play Store (prête à copier) + assetlinks.json

---

## 1) assetlinks.json (ouverture plein écran, sans barre de navigateur — TWA)

Le fichier est déjà créé : **`public/.well-known/assetlinks.json`** → servi en ligne à
`https://TON-DOMAINE/.well-known/assetlinks.json` après déploiement.

Il faut juste y mettre **l'empreinte SHA-256** de ta clé de signature :

```bash
# Empreinte de TON keystore :
keytool -list -v -keystore flex.keystore -alias flex
# → copie la ligne "SHA256:" (ex. AB:CD:12:...) dans sha256_cert_fingerprints
```
> Si tu passes par **PWABuilder**, il te donne directement cette empreinte (et peut
> générer le fichier pour toi). Avec le **Play App Signing** activé, ajoute AUSSI
> l'empreinte fournie par la Play Console (souvent 2 empreintes dans la liste).

Après mise à jour + déploiement, l'app Android s'ouvre **en plein écran** (sans
l'adresse du navigateur).

---

## 2) Fiche Play Store (textes)

> Remplis ça dans **Play Console → Présence sur le Store → Fiche principale**.

### Nom de l'application (30 caractères max)
```
FLEX — Réseau social
```

### Description courte (80 caractères max)
```
Le réseau social du Flex : partage, chat, appels gratuits, jeux et Sparks.
```

### Description complète (4000 caractères max)
```
FLEX, c'est le réseau social nouvelle génération pensé pour toi.

Brille en public, libère-toi en privé. Partage tes meilleurs moments dans le Flow,
discute en privé comme sur une messagerie, appelle gratuitement tes amis en audio
ou en vidéo, joue, passe en live, et gagne des Sparks — la monnaie de FLEX.

✦ PARTAGE TON FLEX
Photos, vidéos, sons, ambiances : un Studio créatif complet avec filtres, musique
et montage. Tes vidéos longues sont automatiquement découpées et jouées à la chaîne.

✦ MESSAGERIE & APPELS GRATUITS
Messages, médias, messages vocaux, stickers, réactions, statuts qui disparaissent
en 24 h. Appels audio et vidéo gratuits, en privé ou en groupe — avec messagerie et
enregistrement pendant l'appel.

✦ GALERIE PRIVÉE SÉCURISÉE
Enregistre tes publications, médias reçus et appels dans une galerie privée
protégée par code. Verrou facial / empreinte (Face ID) en option.

✦ COMMUNAUTÉ & JEUX
Rejoins des Squads, relève des défis, grimpe dans les classements, passe en Live et
reçois des cadeaux. Trouve facilement tes amis par pseudo, numéro ou contacts.

✦ PERSONNALISE TOUT
13 thèmes de couleur, mode jour/nuit/auto, bannière, musique de profil. Une app qui
s'adapte à ton téléphone, ta tablette ou ton PC.

✦ SÉCURISÉ & RESPECTUEUX
Mot de passe obligatoire, récupération sécurisée, modération active, et un contrôle
total sur ta vie privée.

Rejoins les premiers Pionniers et écris l'histoire de FLEX.

FLEX est un produit de XOFIX Internationale.
```

### Catégorie
```
Réseaux sociaux
```

### Coordonnées
- E-mail : `[ton email support]`
- Site web : `[ton site / URL FLEX]`
- Politique de confidentialité (OBLIGATOIRE) : `[URL de ta politique de confidentialité]`

### Texte « Nouveautés » (version 1.0)
```
Première version de FLEX 🎉
Flow, messagerie, appels gratuits, vocaux, galerie privée, défis, live, thèmes et
plus. Bienvenue chez les Pionniers !
```

### Mots-clés / ASO (à répartir dans les textes)
réseau social, chat, appel vidéo gratuit, messagerie, stories, vocaux, jeux, live,
créateurs, Afrique, Sparks.

---

## 3) Visuels à fournir (exigences Play Store)
- **Icône** : 512×512 PNG (ton logo). Génère-la avec `npm run mobile:icons`.
- **Image de présentation** : 1024×500 PNG/JPG.
- **Captures d'écran téléphone** : 2 à 8, min 320 px de côté (Flow, chat, appel,
  profil, galerie…).
- (Option) Captures tablette pour une meilleure visibilité.

> Astuce : prends les captures en mode nuit ET montre 1-2 écrans clés (Flow + appel).
