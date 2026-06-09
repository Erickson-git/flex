import type { DirectThread, Flex, Profile, ShopItem, Squad, Story } from './types'
import { dicebear, MEDIA, squadCover } from './media'

// ─────────────────────────────────────────────────────────────
// Données factices — l'"illusion de densité".
// Un réseau déjà plein de stars, de stories et de médias premium
// donne l'impression d'arriver dans un club bondé dès la 1re seconde.
// ─────────────────────────────────────────────────────────────

const now = Date.now()
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString()

function star(
  id: string,
  username: string,
  display: string,
  bio: string,
  rank: number,
  followers: number,
  score: number,
): Profile {
  return {
    id,
    username,
    display_name: display,
    avatar_url: dicebear(username),
    bio,
    tier: rank <= 100 ? 'pioneer' : rank <= 1000 ? 'founder' : 'member',
    joined_rank: rank,
    followers_count: followers,
    following_count: 120 + (rank % 300),
    flex_score: score,
    created_at: minutesAgo(60 * 24 * (10 - (rank % 9))),
  }
}

export const DEMO_PROFILES: Profile[] = [
  star('u_nova', 'nova', 'NOVA', 'Skyline addict ✦ couchers de soleil de luxe', 3, 128400, 142000),
  star('u_zayn', 'zayn.exe', 'Zayn', 'Beatmaker nocturne 🎧 rap & néon', 11, 84300, 96000),
  star('u_lux', 'lux', 'LUX', 'Less but better. Mode & art.', 27, 52100, 41000),
  star('u_mia', 'mia.rose', 'Mia Rose', 'soft life only 🤍', 142, 23100, 28000),
  star('u_drei', 'drei', 'Drei', 'on monte. 📈', 305, 9400, 7600),
  star('u_kenz', 'kenzo', 'KENZO', 'streetwear / drops / hype', 58, 67200, 61000),
]

// Vibe Audio : un morceau d'ambiance par star (liens publics d'exemple).
const MUSIC = [
  'https://soundcloud.com/officialnf/the-search',
  'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
  'https://soundcloud.com/theweeknd/blinding-lights',
  'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
  'https://soundcloud.com/drake-official/one-dance',
  'https://open.spotify.com/track/2XU0oxnq2qxCpomAAuJY8K',
]
DEMO_PROFILES.forEach((p, i) => {
  p.music_url = MUSIC[i % MUSIC.length]
})

const profileOf = (id: string) => DEMO_PROFILES.find((p) => p.id === id)!

export const DEMO_STORIES: Story[] = DEMO_PROFILES.map((p, i) => ({
  id: `s_${p.id}`,
  author_id: p.id,
  author: p,
  media_url: [...MEDIA.nightlife, ...MEDIA.luxury, ...MEDIA.neon, ...MEDIA.fashion][i % 16],
  seen: false,
}))

export const DEMO_FLEXES: Flex[] = [
  {
    id: 'f1',
    author_id: 'u_nova',
    author: profileOf('u_nova'),
    content: 'Vue depuis le 41e. La ville scintille comme nous ce soir. ✦',
    media_url: MEDIA.nightlife[0],
    likes_count: 12840,
    comments_count: 962,
    created_at: minutesAgo(2),
  },
  {
    id: 'f2',
    author_id: 'u_kenz',
    author: profileOf('u_kenz'),
    content: 'Le drop de minuit. Qui est prêt ? 🔥',
    media_url: MEDIA.fashion[0],
    likes_count: 8420,
    comments_count: 511,
    created_at: minutesAgo(5),
  },
  {
    id: 'f3',
    author_id: 'u_zayn',
    author: profileOf('u_zayn'),
    content: 'Nouveau son vendredi. Premier extrait dans The Squads 🤫',
    media_url: MEDIA.neon[0],
    likes_count: 6190,
    comments_count: 348,
    created_at: minutesAgo(9),
  },
  {
    id: 'f4',
    author_id: 'u_lux',
    author: profileOf('u_lux'),
    content: 'On ne suit pas la tendance. On EST la tendance.',
    media_url: MEDIA.luxury[0],
    likes_count: 5030,
    comments_count: 280,
    created_at: minutesAgo(14),
  },
  {
    id: 'f5',
    author_id: 'u_mia',
    author: profileOf('u_mia'),
    content: 'Petit-déj sur le rooftop. La routine des gens bien. 🤍',
    media_url: MEDIA.luxury[3],
    likes_count: 3180,
    comments_count: 221,
    created_at: minutesAgo(22),
  },
  {
    id: 'f6',
    author_id: 'u_drei',
    author: profileOf('u_drei'),
    content: 'Rappel : tu es parmi les premiers. Tu écris l’histoire. 📈',
    media_url: MEDIA.neon[2],
    likes_count: 2110,
    comments_count: 174,
    created_at: minutesAgo(31),
  },
]

// Signaux d'engagement réalistes (vues / partages / rétention) pour Trends.
DEMO_FLEXES.forEach((f) => {
  f.views_count = f.likes_count * 7
  f.shares_count = Math.floor(f.likes_count / 12)
  f.dwell_ms_total = f.likes_count * 1500
})

// ── Squads (communautés) ────────────────────────────────────────
export const DEMO_SQUADS: Squad[] = [
  { id: 'sq_showbiz', name: 'Showbiz', topic: 'Stars, buzz & red carpet', emoji: '🌟', cover_url: squadCover(1), members_count: 8420, accent: 'from-gold to-flex-pink' },
  { id: 'sq_mode', name: 'Mode', topic: 'Fits, drops & runway', emoji: '👗', cover_url: squadCover(2), members_count: 6310, accent: 'from-flex-pink to-flex-violet' },
  { id: 'sq_rap', name: 'Rap', topic: 'Sons, freestyles & clips', emoji: '🎤', cover_url: squadCover(3), members_count: 9920, accent: 'from-flex-violet to-flex-cyan' },
  { id: 'sq_night', name: 'Nightlife', topic: 'Soirées & afters', emoji: '🌙', cover_url: squadCover(4), members_count: 5140, accent: 'from-flex-cyan to-flex-violet' },
  { id: 'sq_street', name: 'Streetwear', topic: 'Hype & sneakers', emoji: '👟', cover_url: squadCover(5), members_count: 7250, accent: 'from-gold to-flex-cyan' },
  { id: 'sq_secret', name: 'Secret', topic: 'Cercle privé, sur invitation', emoji: '🕶️', cover_url: squadCover(6), members_count: 312, accent: 'from-zinc-600 to-zinc-800', secret: true },
]

// ── Teufs (événements / fêtes) ──────────────────────────────────
export const DEMO_TEUFS: Squad[] = [
  {
    id: 'tf_rooftop',
    name: 'Rooftop Sunset',
    topic: 'DJ set + cocktails au coucher du soleil',
    emoji: '🌇',
    cover_url: MEDIA.luxury[1],
    members_count: 142,
    accent: 'from-gold to-flex-pink',
    kind: 'teuf',
    date: new Date(now + 86_400_000 * 2).toISOString(),
    price: 200,
    location: 'Sky Lounge, Cotonou',
    map_url: 'https://maps.google.com/?q=Cotonou',
  },
  {
    id: 'tf_neon',
    name: 'Neon Warehouse',
    topic: 'Rave néon, dress code fluo',
    emoji: '⚡',
    cover_url: MEDIA.neon[0],
    members_count: 318,
    accent: 'from-flex-violet to-flex-cyan',
    kind: 'teuf',
    date: new Date(now + 86_400_000 * 5).toISOString(),
    price: 0,
    location: 'Hangar 9',
    map_url: 'https://maps.google.com/?q=warehouse',
  },
]

// ── Flex Shop ────────────────────────────────────────────────────
export const DEMO_SHOP: ShopItem[] = [
  { id: 'it1', seller_id: 'u_kenz', seller_name: 'KENZO', title: 'Hoodie oversize signé', photo_url: MEDIA.fashion[0], price: 1500, currency: 'sparks', category: 'streetwear' },
  { id: 'it2', seller_id: 'u_lux', seller_name: 'LUX', title: 'Lunettes Aura Gold', photo_url: MEDIA.fashion[1], price: 8000, currency: 'fcfa', category: 'accessoire' },
  { id: 'it3', seller_id: 'u_mia', seller_name: 'Mia Rose', title: 'Kit Glow beauté', photo_url: MEDIA.fashion[2], price: 900, currency: 'sparks', category: 'beaute' },
  { id: 'it4', seller_id: 'u_nova', seller_name: 'NOVA', title: 'Sneakers édition néon', photo_url: MEDIA.fashion[3], price: 12000, currency: 'fcfa', category: 'streetwear' },
  // Fripes & Goodies Manga
  { id: 'it5', seller_id: 'u_zayn', seller_name: 'Zayn', title: 'Lot de 5 tomes (occasion)', photo_url: MEDIA.neon[1], price: 2500, currency: 'fcfa', category: 'manga' },
  { id: 'it6', seller_id: 'u_kenz', seller_name: 'KENZO', title: 'Figurine collector', photo_url: MEDIA.neon[3], price: 2200, currency: 'sparks', category: 'manga' },
]

export const SQUAD_SEED_MESSAGES: Record<string, { name: string; text: string }[]> = {
  sq_showbiz: [
    { name: 'NOVA', text: 'Vous avez vu le tapis rouge hier ? 🤯' },
    { name: 'Mia Rose', text: 'La robe de la fin… iconique.' },
    { name: 'Drei', text: 'On en parle du after secret ?' },
  ],
  sq_rap: [
    { name: 'Zayn', text: 'Extrait dans 10 min ici 🎧' },
    { name: 'KENZO', text: 'go go go' },
  ],
}

// ── Directs (messagerie privée) ─────────────────────────────────
export const DEMO_THREADS: DirectThread[] = [
  { id: 'dm_nova', peer: profileOf('u_nova'), last_message: 'On se voit au rooftop ce soir ?', last_at: minutesAgo(3), unread: 2 },
  { id: 'dm_kenz', peer: profileOf('u_kenz'), last_message: 'Je te garde une paire 👟', last_at: minutesAgo(18), unread: 0 },
  { id: 'dm_zayn', peer: profileOf('u_zayn'), last_message: 'Écoute ça 🔥🔥', last_at: minutesAgo(64), unread: 1 },
  { id: 'dm_lux', peer: profileOf('u_lux'), last_message: 'Tu as adoré le shooting', last_at: minutesAgo(180), unread: 0 },
]

export const DM_SEED: Record<string, { mine: boolean; text: string; media?: string }[]> = {
  dm_nova: [
    { mine: false, text: 'Hey ! Bienvenue dans le club 😎' },
    { mine: false, text: 'On se voit au rooftop ce soir ?' },
    { mine: true, text: 'Carrément, j’apporte l’énergie ✦' },
  ],
  dm_kenz: [
    { mine: false, text: 'Le drop sort à minuit', media: MEDIA.fashion[1] },
    { mine: false, text: 'Je te garde une paire 👟' },
  ],
  dm_zayn: [{ mine: false, text: 'Écoute ça 🔥🔥' }],
  dm_lux: [{ mine: false, text: 'Tu as adoré le shooting' }],
}

/** Noms qui défilent dans le ticker "activité en direct". */
export const LIVE_TICKER = [
  'nova vient de flexer',
  'zayn.exe a gagné 240 followers',
  'lux est en feu 🔥',
  'kenzo a lâché un drop',
  '3 nouveaux pionniers ce soir',
  'drei a atteint Vanguard',
]
