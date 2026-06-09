# Icônes PWA

Place ici deux PNG pour que l'app soit installable :

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

## Génération rapide (1 commande)

Depuis la racine du projet, avec le `favicon.svg` fourni :

```bash
npx -y @resvg/resvg-js-cli ./public/favicon.svg -w 192 -h 192 ./public/icons/icon-192.png
npx -y @resvg/resvg-js-cli ./public/favicon.svg -w 512 -h 512 ./public/icons/icon-512.png
```

Ou, plus simple : ouvre `favicon.svg`, exporte-le en PNG (192 et 512 px) avec
n'importe quel outil (Figma, https://realfavicongenerator.net, etc.) et dépose
les fichiers ici. L'app fonctionne et se build même sans ces PNG ; ils ne sont
requis que pour l'icône d'installation sur l'écran d'accueil.
