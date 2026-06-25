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

// Les clés = nom du fichier mp3 (ne pas modifier). Seuls les TITRES affichés
// sont uniformisés en « FLEX 0xx » (l'ordre = la numérotation).
const FILES: Record<string, string> = {
  catch_the_pulse: 'FLEX 001',
  chrome_tension: 'FLEX 002',
  close_enough: 'FLEX 003',
  different_timezone: 'FLEX 004',
  fless_dans_la_tess: 'FLEX 005',
  gemini_music: 'FLEX 006',
  gemini_music_2: 'FLEX 007',
  gemini_music_3: 'FLEX 008',
  gemini_music_4: 'FLEX 009',
  glass_horizon: 'FLEX 010',
  horizon_grand_ouvert: 'FLEX 011',
  ice_on_the_wrist: 'FLEX 012',
  kizuna_eien: 'FLEX 013',
  la_seule_richesse: 'FLEX 014',
  libre_dans_ma_t_te: 'FLEX 015',
  lightning_in_my_feet: 'FLEX 016',
  midnight_flex: 'FLEX 017',
  midnight_pavement: 'FLEX 018',
  midnight_pavement_2: 'FLEX 019',
  open_horizon: 'FLEX 020',
  overclocked_heart: 'FLEX 021',
  perfect_row: 'FLEX 022',
  sans_poids: 'FLEX 023',
  smooth_in_the_heat: 'FLEX 024',
  the_glass_hour: 'FLEX 025',
  the_iron_vow: 'FLEX 026',
  the_slowest_exhale: 'FLEX 027',
  velvet_tension: 'FLEX 028',
  z_ro_g: 'FLEX 029',
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
