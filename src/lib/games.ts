import { DEMO_MODE, supabase } from './supabase'
import { ensureCanInteract } from './guard'

// ─────────────────────────────────────────────────────────────
// Pôle Gaming — scores & classement (cf. games.sql).
// Le multijoueur temps réel s'appuiera sur Supabase Realtime (canaux).
// ─────────────────────────────────────────────────────────────

export interface LeaderRow {
  user_id: string
  username: string
  avatar_url: string | null
  best: number
}

export async function submitScore(userId: string, game: string, score: number): Promise<void> {
  ensureCanInteract()
  if (DEMO_MODE || score <= 0) return
  try {
    await supabase!.from('game_scores').insert({ user_id: userId, game, score })
  } catch {
    /* games.sql pas encore exécuté : on n'empêche pas de jouer */
  }
}

export async function fetchLeaderboard(game: string, limit = 20): Promise<LeaderRow[]> {
  if (DEMO_MODE) return []
  try {
    const { data } = await supabase!.rpc('game_leaderboard', { p_game: game, p_limit: limit })
    return (data ?? []) as LeaderRow[]
  } catch {
    return []
  }
}
