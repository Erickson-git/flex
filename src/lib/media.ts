// ─────────────────────────────────────────────────────────────
// Gestion autonome des médias.
// - Photos : Unsplash (banque gratuite), thèmes luxe / néon / mode / club.
// - Avatars : DiceBear (génération stylisée gratuite, sans clé API).
// Un fallback dégradé (voir SmartImage) garantit qu'AUCUN visuel
// n'apparaît vide, même si une URL distante échoue.
// ─────────────────────────────────────────────────────────────

const U = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

/** Banques thématiques (mots-clés : luxury, cyberpunk neon, streetwear, club). */
export const MEDIA = {
  nightlife: [
    U('1571266028243-d220c9c3b31e'),
    U('1516450360452-9312f5e86fc7'),
    U('1492684223066-81342ee5ff30'),
    U('1545128485-c400e7702796'),
  ],
  luxury: [
    U('1551038247-3d9af20df552'),
    U('1542317854-b2c1b3b8b6b0'),
    U('1518895949257-7621c3c786d7'),
    U('1505691938895-1758d7feb511'),
  ],
  neon: [
    U('1493225457124-a3eb161ffa5f'),
    U('1535223289827-42f1e9919769'),
    U('1492447166138-50c3889fccb1'),
    U('1550684376-efcbd6e3f031'),
  ],
  fashion: [
    U('1483985988355-763728e1935b'),
    U('1490481651871-ab68de25d43d'),
    U('1529139574466-a303027c1d8b'),
    U('1485462537746-965f33f7f6a7'),
  ],
} as const

const ALL_MEDIA = [
  ...MEDIA.nightlife,
  ...MEDIA.luxury,
  ...MEDIA.neon,
  ...MEDIA.fashion,
]

export function pickMedia(seed: number): string {
  return ALL_MEDIA[Math.abs(seed) % ALL_MEDIA.length]
}

// ── Avatars DiceBear ────────────────────────────────────────────
// Styles "premium", choisis selon le pseudo pour de la variété.
const DICEBEAR_STYLES = ['micah', 'adventurer', 'lorelei', 'notionists', 'thumbs']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** URL d'avatar généré, unique et stable pour un même seed. */
export function dicebear(seed: string): string {
  const style = DICEBEAR_STYLES[hash(seed) % DICEBEAR_STYLES.length]
  const bg = ['b6e3f4', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0aede'][hash(seed) % 5]
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundColor=${bg}&radius=50`
}

/** Couverture stylisée pour un Squad. */
export function squadCover(seed: number): string {
  return pickMedia(seed * 7 + 3)
}
