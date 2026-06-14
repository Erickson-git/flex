// ─────────────────────────────────────────────────────────────
// Bibliothèque audio FLEX : musiques fournies (public/audio/*.mp3).
// Sert pour : la Vibe de profil, la musique attachée aux Flex,
// les sonneries d'appel, et la playlist d'écoute.
// ─────────────────────────────────────────────────────────────

export interface Track {
  id: string // = nom de fichier sans extension
  title: string
  url: string
}

const FILES: Record<string, string> = {
  catch_the_pulse: 'Catch the Pulse',
  chrome_tension: 'Chrome Tension',
  close_enough: 'Close Enough',
  different_timezone: 'Different Timezone',
  fless_dans_la_tess: 'Fless dans la Tess',
  gemini_music: 'Gemini',
  gemini_music_2: 'Gemini II',
  gemini_music_3: 'Gemini III',
  gemini_music_4: 'Gemini IV',
  glass_horizon: 'Glass Horizon',
  horizon_grand_ouvert: 'Horizon Grand Ouvert',
  ice_on_the_wrist: 'Ice on the Wrist',
  kizuna_eien: 'Kizuna Eien',
  la_seule_richesse: 'La Seule Richesse',
  libre_dans_ma_t_te: 'Libre dans ma Tête',
  lightning_in_my_feet: 'Lightning in my Feet',
  midnight_flex: 'Midnight Flex',
  midnight_pavement: 'Midnight Pavement',
  midnight_pavement_2: 'Midnight Pavement II',
  open_horizon: 'Open Horizon',
  overclocked_heart: 'Overclocked Heart',
  perfect_row: 'Perfect Row',
  sans_poids: 'Sans Poids',
  smooth_in_the_heat: 'Smooth in the Heat',
  the_glass_hour: 'The Glass Hour',
  the_iron_vow: 'The Iron Vow',
  the_slowest_exhale: 'The Slowest Exhale',
  velvet_tension: 'Velvet Tension',
  z_ro_g: 'Zéro G',
}

export const TRACKS: Track[] = Object.entries(FILES).map(([id, title]) => ({
  id,
  title,
  url: `/audio/${id}.mp3`,
}))

export function trackById(id: string | null | undefined): Track | undefined {
  if (!id) return undefined
  return TRACKS.find((t) => t.id === id)
}

/** Retrouve une piste à partir d'une URL /audio/xxx.mp3 (musique attachée). */
export function trackByUrl(url: string | null | undefined): Track | undefined {
  if (!url) return undefined
  return TRACKS.find((t) => url.endsWith(t.url) || url === t.url || url.endsWith(`/audio/${t.id}.mp3`))
}

// ── Sonnerie d'appel (choix utilisateur, persistant) ──
const RINGTONE_KEY = 'flex.ringtone'
export const DEFAULT_RINGTONE = 'libre_dans_ma_t_te'

export function getRingtoneId(): string {
  try {
    return localStorage.getItem(RINGTONE_KEY) || DEFAULT_RINGTONE
  } catch {
    return DEFAULT_RINGTONE
  }
}

export function setRingtoneId(id: string): void {
  try {
    localStorage.setItem(RINGTONE_KEY, id)
  } catch {
    /* quota — ignore */
  }
}

export function ringtoneUrl(): string {
  const t = trackById(getRingtoneId()) ?? trackById(DEFAULT_RINGTONE)
  return t?.url ?? `/audio/${DEFAULT_RINGTONE}.mp3`
}
