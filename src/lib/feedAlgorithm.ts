import type { Flex } from './types'

// ─────────────────────────────────────────────────────────────
// Le moteur de recommandation FLEX.
// Plus un post retient l'attention (dwell), fait réagir (likes/commentaires)
// et circule (partages), plus il est propulsé dans "Trends" / le flux global.
// Score type Hacker-News : engagement pondéré / décroissance temporelle.
// ─────────────────────────────────────────────────────────────

export function trendingScore(f: Flex): number {
  const likes = f.likes_count
  const comments = f.comments_count
  const shares = f.shares_count ?? 0
  const dwellSec = Math.min((f.dwell_ms_total ?? 0) / 1000, 5000)

  const engagement = likes * 1.0 + comments * 2.0 + shares * 3.0 + dwellSec * 0.05
  const ageHours = Math.max((Date.now() - new Date(f.created_at).getTime()) / 3_600_000, 1)
  return engagement / Math.pow(ageHours + 2, 1.4)
}

/** Ratio d'interactivité (réactions / vues) — qualité de l'attention. */
export function interactivityRatio(f: Flex): number {
  const views = Math.max(f.views_count ?? 0, 1)
  return (f.likes_count + f.comments_count + (f.shares_count ?? 0)) / views
}

/** Flux "Pour toi" : récence + popularité (équilibré). */
export function sortForYou(list: Flex[]): Flex[] {
  return [...list].sort((a, b) => {
    const ageA = (Date.now() - new Date(a.created_at).getTime()) / 60000
    const ageB = (Date.now() - new Date(b.created_at).getTime()) / 60000
    const sa = a.likes_count * 0.5 + a.comments_count * 1.2 + Math.max(0, 120 - ageA) * 3
    const sb = b.likes_count * 0.5 + b.comments_count * 1.2 + Math.max(0, 120 - ageB) * 3
    return sb - sa
  })
}

/** Flux "Trends" : pur engagement propulsé. */
export function sortTrending(list: Flex[]): Flex[] {
  return [...list].sort((a, b) => trendingScore(b) - trendingScore(a))
}
