import type { Flex } from './types'
import { isAudioUrl, isVideoUrl } from './upload'

// ─────────────────────────────────────────────────────────────
// MOTEUR D'EXPÉRIENCE PERSONNALISÉ (psychologie de la rétention, éthique).
//
// Il apprend, en local, ce qui capte CHAQUE utilisateur :
//   • affinité par AUTEUR (qui il aime regarder)
//   • affinité par TYPE de contenu (vidéo / image / audio / texte)
//   • heures d'activité (quand il est réceptif)
// puis il personnalise le flux « Pour toi » en combinant :
//   fraîcheur + popularité (preuve sociale) + affinité + NOUVEAUTÉ (exploration)
//   + DIVERSITÉ (anti-lassitude : on n'enchaîne pas le même auteur).
//
// Principes : renforcement positif et pertinence — PAS de tromperie. Tout est
// local et transparent (aucune donnée sensible, aucune boîte noire serveur).
// ─────────────────────────────────────────────────────────────

type ContentType = 'video' | 'image' | 'audio' | 'gradient' | 'text'

interface Affinity {
  authors: Record<string, number>
  types: Partial<Record<ContentType, number>>
  hours: number[] // 24 cases : activité par heure locale
  updated: number
}

const KEY = 'flex.affinity'
const HALF_LIFE_DAYS = 7 // l'affinité "refroidit" doucement → reste adaptable

const WEIGHTS: Record<string, number> = {
  view: 0.4,
  dwell: 1, // multiplié par les secondes (plafonné)
  like: 3,
  comment: 5,
  share: 4,
  profile: 2,
  save: 3,
}

function contentType(f: Flex): ContentType {
  if (f.media_url?.startsWith('gradient:')) return 'gradient'
  if (isVideoUrl(f.media_url) || (f.media_urls && f.media_urls.length > 1)) return 'video'
  if (isAudioUrl(f.media_url)) return 'audio'
  if (f.media_url) return 'image'
  return 'text'
}

function load(): Affinity {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Affinity
  } catch {
    /* ignore */
  }
  return { authors: {}, types: {}, hours: new Array(24).fill(0), updated: Date.now() }
}

/** Applique la décroissance temporelle (demi-vie) à toutes les affinités. */
function decay(a: Affinity): Affinity {
  const days = (Date.now() - a.updated) / 86_400_000
  if (days < 0.5) return a
  const f = Math.pow(0.5, days / HALF_LIFE_DAYS)
  for (const k in a.authors) a.authors[k] *= f
  for (const k in a.types) a.types[k as ContentType] = (a.types[k as ContentType] ?? 0) * f
  a.hours = a.hours.map((h) => h * f)
  a.updated = Date.now()
  return a
}

function save(a: Affinity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a))
  } catch {
    /* quota */
  }
}

/** Enregistre une interaction → renforce les affinités correspondantes. */
export function recordEngagement(flex: Flex, kind: keyof typeof WEIGHTS, seconds = 0): void {
  const a = decay(load())
  const w = kind === 'dwell' ? WEIGHTS.dwell * Math.min(seconds, 30) * 0.1 : WEIGHTS[kind] ?? 1
  if (flex.author_id) a.authors[flex.author_id] = (a.authors[flex.author_id] ?? 0) + w
  const t = contentType(flex)
  a.types[t] = (a.types[t] ?? 0) + w
  a.hours[new Date().getHours()] = (a.hours[new Date().getHours()] ?? 0) + w
  save(a)
}

function maxVal(rec: Record<string, number>): number {
  let m = 0
  for (const k in rec) if (rec[k] > m) m = rec[k]
  return m || 1
}

/**
 * Flux « Pour toi » PERSONNALISÉ. Score = fraîcheur + preuve sociale + affinité
 * (auteur & type) + nouveauté, puis ré-étalement pour la diversité.
 */
export function personalizeFeed(list: Flex[]): Flex[] {
  if (list.length <= 1) return [...list]
  const a = decay(load())
  const maxAuthor = maxVal(a.authors)
  const maxType = maxVal(a.types as Record<string, number>)
  const hour = new Date().getHours()
  const hourPeak = maxVal(a.hours.reduce((o, v, i) => ((o[i] = v), o), {} as Record<string, number>))
  const hourBoost = (a.hours[hour] ?? 0) / hourPeak // 0..1 : l'utilisateur est-il dans sa fenêtre active ?

  const scored = list.map((f) => {
    const ageMin = (Date.now() - new Date(f.created_at).getTime()) / 60000
    const freshness = Math.max(0, 120 - ageMin) * 3 // bonus 2 h
    const social = f.likes_count * 0.5 + f.comments_count * 1.2 + (f.shares_count ?? 0) * 1.5
    const authorAff = ((a.authors[f.author_id] ?? 0) / maxAuthor) * 60 // forte pondération
    const typeAff = ((a.types[contentType(f)] ?? 0) / maxType) * 25
    // Nouveauté : un auteur jamais vu reçoit un petit bonus d'exploration
    const novelty = a.authors[f.author_id] ? 0 : 8
    // Léger coup de pouce si on est dans la fenêtre horaire active de l'utilisateur
    const timely = freshness * 0.15 * hourBoost
    // Variabilité douce (récompense intermittente) déterministe par id → pas de re-tri instable
    const jitter = (f.id.charCodeAt(0) % 7) * 1.5
    return { f, score: freshness + social + authorAff + typeAff + novelty + timely + jitter }
  })

  scored.sort((x, y) => y.score - x.score)

  // DIVERSITÉ : on évite d'enchaîner deux posts du même auteur (anti-lassitude).
  const out: Flex[] = []
  const pending = [...scored]
  let lastAuthor = ''
  while (pending.length) {
    let idx = pending.findIndex((s) => s.f.author_id !== lastAuthor)
    if (idx === -1) idx = 0 // il ne reste que le même auteur
    const [picked] = pending.splice(idx, 1)
    out.push(picked.f)
    lastAuthor = picked.f.author_id
  }
  return out
}

/** Heure (0-23) où l'utilisateur est le plus actif — pour les rappels au bon moment. */
export function peakActiveHour(): number {
  const a = load()
  let best = 19
  let max = -1
  a.hours.forEach((v, i) => {
    if (v > max) {
      max = v
      best = i
    }
  })
  return best
}
