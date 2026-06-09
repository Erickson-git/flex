import { clsx, type ClassValue } from 'clsx'
import type { Prestige, Tier } from './types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** "il y a 3 min", "il y a 2 h" — donne l'effet "ça vit en ce moment". */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'à l’instant'
  if (s < 60) return `il y a ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}

/** Format compact : 1.2k, 14.5k, 1.1M. */
export function compact(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

const RESERVED = new Set(['admin', 'flex', 'staff', 'support', 'official', 'root'])

/** Validation pseudo : 3-20 car., lettres/chiffres/_/. */
export function validateUsername(u: string): string | null {
  const v = u.trim().toLowerCase()
  if (v.length < 3) return 'Minimum 3 caractères.'
  if (v.length > 20) return 'Maximum 20 caractères.'
  if (!/^[a-z0-9_.]+$/.test(v)) return 'Lettres, chiffres, "_" et "." uniquement.'
  if (RESERVED.has(v)) return 'Ce pseudo est réservé.'
  return null
}

export function tierLabel(tier: Tier): string {
  return tier === 'pioneer' ? 'PIONNIER' : tier === 'founder' ? 'FONDATEUR' : 'MEMBRE'
}

/**
 * Statut auto selon le rang d'inscription — moteur de rareté.
 * Les 100 premiers = Pionniers (l'élite), 100→1000 = Fondateurs.
 */
export function tierFromRank(rank: number): Tier {
  if (rank <= 100) return 'pioneer'
  if (rank <= 1000) return 'founder'
  return 'member'
}

/** Vibration haptique légère (micro-récompense tactile sur mobile). */
export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* no-op */
    }
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Sécurité : nettoyage / validation des entrées utilisateur ────

const INJECTION_RE =
  /(<\s*script)|(javascript\s*:)|(on(error|load|click)\s*=)|(union\s+select)|(drop\s+table)|(pg_sleep\s*\()|(xp_cmdshell)/i

/** Détecte une signature d'injection évidente (miroir du garde Postgres). */
export function looksMalicious(text: string): boolean {
  return INJECTION_RE.test(text)
}

// Plage des caractères de contrôle ASCII (00-1F + 7F), construite sans
// littéraux de contrôle dans le source.
const CONTROL_CHARS = new RegExp('[\\x00-\\x1F\\x7F]', 'g')

/**
 * Nettoie un texte avant envoi : retire les caractères de contrôle, neutralise
 * les chevrons (anti-XSS), borne la longueur. React échappe déjà au rendu, mais
 * on assainit en amont (défense en profondeur).
 */
export function sanitizeText(input: string, maxLen = 2000): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(/[<>]/g, (c) => (c === '<' ? '‹' : '›'))
    .slice(0, maxLen)
    .trim()
}

// ── Prestige (axe popularité, distinct du tier d'ancienneté) ─────

interface PrestigeMeta {
  key: Prestige
  label: string
  min: number
  next: number | null
  ring: string // classe de couleur de l'anneau d'avatar
  glow: string
}

export const PRESTIGE_LADDER: PrestigeMeta[] = [
  { key: 'rookie', label: 'ROOKIE', min: 0, next: 1000, ring: 'ring-zinc-500', glow: 'shadow-none' },
  { key: 'vanguard', label: 'VANGUARD', min: 1000, next: 25000, ring: 'ring-flex-cyan', glow: 'shadow-[0_0_24px_-6px_#22d3ee]' },
  { key: 'star', label: 'STAR', min: 25000, next: 100000, ring: 'ring-flex-pink', glow: 'shadow-glow-pink' },
  { key: 'legende', label: 'LÉGENDE', min: 100000, next: null, ring: 'ring-gold', glow: 'shadow-glow' },
]

export function prestigeFromScore(score: number): PrestigeMeta {
  let meta = PRESTIGE_LADDER[0]
  for (const p of PRESTIGE_LADDER) if (score >= p.min) meta = p
  return meta
}

/** Progression (0→1) vers le prochain palier de prestige. */
export function prestigeProgress(score: number): number {
  const m = prestigeFromScore(score)
  if (m.next == null) return 1
  return Math.max(0, Math.min(1, (score - m.min) / (m.next - m.min)))
}

/**
 * "Starification" : boost de départ simulé offert au nouvel inscrit pour
 * qu'il se sente immédiatement populaire (effet tapis rouge).
 */
export function starterBoost(): { score: number; followers: number } {
  // ~620-950 → reste "Rookie" mais à 60-95 % de Vanguard : un premier
  // post suffit à débloquer le palier suivant (effet level-up immédiat).
  const score = 620 + Math.floor(Date.now() % 330)
  const followers = 180 + Math.floor(Date.now() % 420)
  return { score, followers }
}
