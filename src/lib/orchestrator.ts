import type { Spotlight } from './types'

// ─────────────────────────────────────────────────────────────
// "LE CHEF D'ORCHESTRE" — moteur de ré-engagement local.
//
// Il observe des signaux d'engagement (temps passé, swipes/scroll,
// ouverture des Hideouts, likes donnés) et calcule un score décroissant.
// Quand l'utilisateur montre des signes de décrochage, il arme un
// "Coup de Projecteur" : son prochain post sera boosté pendant 15 min
// pour déclencher une vague de Flex et le ramener dans l'appli.
//
// Tout est local et observable — aucune boîte noire serveur requise pour
// la V1 (la version Supabase appelle la RPC `grant_spotlight`).
// ─────────────────────────────────────────────────────────────

interface Signal {
  t: number // timestamp ms
  w: number // poids
}

const KEY = {
  signals: 'flex.engagement.signals',
  lastSeen: 'flex.engagement.lastSeen',
  spotlight: 'flex.spotlight',
  armed: 'flex.spotlight.armed', // un spotlight est armé pour le prochain post
}

const WEIGHTS: Record<string, number> = {
  open: 3,
  scroll: 1,
  swipe: 1.5,
  like: 2,
  hideout: 4,
  post: 5,
  message: 2.5,
}

const HALF_LIFE_MS = 8 * 60_000 // l'engagement "refroidit" en ~8 min
const DISENGAGE_THRESHOLD = 6 // sous ce score → décrochage
const IDLE_GAP_MS = 45_000 // 45 s sans signal = trou d'attention
const COOLDOWN_MS = 30 * 60_000 // pas plus d'un spotlight / 30 min

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, v: T) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* quota */
  }
}

/** Enregistre un signal d'engagement. */
export function recordSignal(type: keyof typeof WEIGHTS | string) {
  const now = Date.now()
  const w = WEIGHTS[type] ?? 1
  const signals = read<Signal[]>(KEY.signals, []).filter((s) => now - s.t < HALF_LIFE_MS * 3)
  signals.push({ t: now, w })
  write(KEY.signals, signals)
  write(KEY.lastSeen, now)
}

/** Score d'engagement courant (somme pondérée à décroissance exponentielle). */
export function engagementScore(): number {
  const now = Date.now()
  return read<Signal[]>(KEY.signals, []).reduce((acc, s) => {
    const age = now - s.t
    return acc + s.w * Math.pow(0.5, age / HALF_LIFE_MS)
  }, 0)
}

/** L'utilisateur décroche-t-il ? (score faible OU trou d'attention) */
export function isDisengaging(): boolean {
  const now = Date.now()
  const lastSeen = read<number>(KEY.lastSeen, now)
  const idle = now - lastSeen > IDLE_GAP_MS
  return engagementScore() < DISENGAGE_THRESHOLD || idle
}

function getSpotlightRaw(): Spotlight {
  const exp = read<number>(KEY.spotlight, 0)
  return { active: exp > Date.now(), expires_at: exp }
}

export function getSpotlight(): Spotlight {
  return getSpotlightRaw()
}

/**
 * Le Chef d'Orchestre tranche : faut-il armer un Coup de Projecteur ?
 * Conditions : décrochage détecté ET hors période de refroidissement.
 */
export function evaluateOrchestrator(): { armed: boolean } {
  const now = Date.now()
  const lastSpotlight = read<number>(KEY.spotlight, 0)
  const onCooldown = now - lastSpotlight < COOLDOWN_MS && lastSpotlight !== 0
  if (isDisengaging() && !onCooldown) {
    write(KEY.armed, true)
    return { armed: true }
  }
  return { armed: read<boolean>(KEY.armed, false) }
}

export function isSpotlightArmed(): boolean {
  return read<boolean>(KEY.armed, false)
}

/**
 * Consomme le spotlight armé au moment d'un post : active 15 min de boost.
 * Renvoie true si un boost vient d'être déclenché.
 */
export function consumeSpotlightForPost(): boolean {
  if (!read<boolean>(KEY.armed, false)) return false
  write(KEY.armed, false)
  write(KEY.spotlight, Date.now() + 15 * 60_000) // Coup de Projecteur : 15 min
  recordSignal('post')
  return true
}

/** Pour la version Supabase : pose un spotlight renvoyé par la RPC. */
export function setSpotlightExpiry(expiresAtMs: number) {
  write(KEY.spotlight, expiresAtMs)
}
