import type { ProfileTheme, Squad } from './types'
import { MEDIA } from './media'

// ─────────────────────────────────────────────────────────────
// Manga & Otaku Sanctuary : titres de prestige, thèmes de profil,
// et template de Squad "Manga Clan" (watchparties / scans).
// ─────────────────────────────────────────────────────────────

export interface OtakuTitle {
  id: string
  label: string
  emoji: string
  price: number // en Sparks (0 = débloqué par palier)
  hint: string
}

/** Titres exclusifs, achetables avec des Sparks (ou débloqués). */
export const OTAKU_TITLES: OtakuTitle[] = [
  { id: 'hokage', label: 'Hokage', emoji: '🍥', price: 1500, hint: 'Chef du village' },
  { id: 'pirate_king', label: 'Roi des Pirates', emoji: '🏴‍☠️', price: 2000, hint: 'Le trône ultime' },
  { id: 'dark_hunter', label: 'Chasseur de Sombres', emoji: '🗡️', price: 1200, hint: 'Traqueur d’ombres' },
  { id: 'super_saiyan', label: 'Super Saiyan', emoji: '⚡', price: 1800, hint: 'Au-delà des limites' },
  { id: 'shadow_monarch', label: 'Monarque des Ombres', emoji: '👑', price: 2500, hint: 'Lève-toi.' },
]

export function otakuTitle(id?: string | null): OtakuTitle | null {
  return OTAKU_TITLES.find((t) => t.id === id) ?? null
}

// ── Thèmes de profil (skins animés) ─────────────────────────────
export interface ThemeSkin {
  id: ProfileTheme
  label: string
  /** Dégradé de bannière. */
  banner: string
  /** Anneau d'avatar. */
  ring: string
  /** Halo. */
  glow: string
  price: number
}

export const THEME_SKINS: ThemeSkin[] = [
  { id: 'none', label: 'Classique', banner: 'from-flex-violet/40 via-ink-700 to-flex-pink/30', ring: 'ring-gold', glow: 'shadow-glow', price: 0 },
  { id: 'chakra', label: 'Chakra Glow', banner: 'from-emerald-500/50 via-ink-700 to-cyan-500/40', ring: 'ring-emerald-400', glow: 'shadow-[0_0_30px_-4px_#34d399]', price: 800 },
  { id: 'saiyan', label: 'Aura de Saiyan', banner: 'from-yellow-400/60 via-ink-700 to-orange-500/40', ring: 'ring-yellow-300', glow: 'shadow-[0_0_34px_-4px_#fde047]', price: 1200 },
  { id: 'manga', label: 'Manga N&B', banner: 'from-zinc-200/20 via-ink-700 to-zinc-500/20', ring: 'ring-zinc-200', glow: 'shadow-[0_0_24px_-6px_#e4e4e7]', price: 600 },
  { id: 'shadow', label: 'Sombre Monarque', banner: 'from-violet-700/60 via-ink-800 to-fuchsia-700/40', ring: 'ring-violet-400', glow: 'shadow-[0_0_34px_-4px_#a78bfa]', price: 1500 },
]

export function themeSkin(id?: ProfileTheme): ThemeSkin {
  return THEME_SKINS.find((t) => t.id === (id ?? 'none')) ?? THEME_SKINS[0]
}

// ── Manga Clans (démo) ──────────────────────────────────────────
export const DEMO_MANGA_CLANS: Squad[] = [
  {
    id: 'mc_shonen',
    name: 'Shōnen Legends',
    topic: 'Watchparties + scans hebdo',
    emoji: '🔥',
    cover_url: MEDIA.neon[1],
    members_count: 1840,
    accent: 'from-orange-500 to-flex-pink',
    kind: 'manga_clan',
    stream_url: 'https://example.com/watchparty',
  },
  {
    id: 'mc_dark',
    name: 'Dark Fantasy Clan',
    topic: 'Berserk, JJK, Solo Leveling',
    emoji: '🗡️',
    cover_url: MEDIA.neon[3],
    members_count: 920,
    accent: 'from-violet-700 to-fuchsia-600',
    kind: 'manga_clan',
    stream_url: 'https://example.com/watchparty2',
  },
]
