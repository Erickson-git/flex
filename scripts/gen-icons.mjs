// Génère les icônes carrées de l'app (PWA / WebAPK / écran d'accueil) à partir
// du logo FLEX. Le logo est centré sur le fond de marque (#050505), avec une
// marge de sécurité pour la version « maskable » (Android rogne les bords).
//
//   node scripts/gen-icons.mjs
//
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'public', 'logo.jpg')
const BG = { r: 5, g: 5, b: 5, alpha: 1 } // #050505 (fond de marque)

/** Logo redimensionné « contain » à `inner`, centré sur un carré `size` plein. */
async function make(size, innerRatio, out) {
  const inner = Math.round(size * innerRatio)
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .toBuffer()
  const pad = Math.round((size - inner) / 2)
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toFile(join(root, out))
  console.log('✓', out, `${size}x${size}`)
}

await make(192, 0.86, 'public/icons/icon-192.png')
await make(512, 0.86, 'public/icons/icon-512.png')
// Maskable : logo plus petit (zone de sécurité ~80 %) pour éviter le rognage.
await make(512, 0.68, 'public/icons/icon-maskable-512.png')
// Écran d'accueil iOS (apple-touch-icon) : carré, fond opaque.
await make(180, 0.86, 'public/apple-touch-icon.png')
console.log('Terminé.')
