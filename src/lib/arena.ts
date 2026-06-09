import { DEMO_MODE, supabase } from './supabase'
import type { ArenaMatch, ArenaPlayer, Profile } from './types'
import { DEMO_PROFILES } from './demoData'
import { applyArenaDelta } from './economy'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// The Flex Arena — duels de tapotement + paris.
// Démo : adversaire/duels simulés en local, gains via le wallet local.
// Prod : matchs + taps via Supabase Realtime, règlement via RPC atomiques.
// ─────────────────────────────────────────────────────────────

function playerFromProfile(p: Profile): ArenaPlayer {
  return { id: p.id, name: p.display_name, avatar: p.avatar_url, score: p.flex_score, music: p.music_url }
}

const stars = DEMO_PROFILES.filter((p) => p.flex_score >= 25000)

/** Duels de stars "à l'affiche" → ouverts aux paris communautaires. */
export function featuredMatches(): ArenaMatch[] {
  return [
    {
      id: 'm_feat_1',
      a: playerFromProfile(stars[0]),
      b: playerFromProfile(stars[1]),
      stake: 500,
      status: 'live',
      a_taps: 0,
      b_taps: 0,
      featured: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'm_feat_2',
      a: playerFromProfile(stars[2] ?? stars[0]),
      b: playerFromProfile(stars[1]),
      stake: 1200,
      status: 'waiting',
      a_taps: 0,
      b_taps: 0,
      featured: true,
      created_at: new Date().toISOString(),
    },
  ]
}

/** Crée un duel express : moi (a) contre une star aléatoire (b). */
export async function createQuickMatch(me: Profile, stake: number): Promise<ArenaMatch> {
  const opponent = stars[(me.username.length + stake) % stars.length] ?? DEMO_PROFILES[0]
  const match: ArenaMatch = {
    id: 'm_' + uid(),
    a: playerFromProfile(me),
    b: playerFromProfile(opponent),
    stake,
    status: 'live',
    a_taps: 0,
    b_taps: 0,
    featured: false,
    created_at: new Date().toISOString(),
  }
  if (DEMO_MODE) {
    try {
      localStorage.setItem('flex.arena.' + match.id, JSON.stringify(match))
    } catch {
      /* quota */
    }
    return match
  }
  const { data, error } = await supabase!
    .from('arena_matches')
    .insert({ player_a: me.id, player_b: opponent.id, stake, status: 'live', ends_at: new Date(Date.now() + 10_000).toISOString() })
    .select('*')
    .single()
  if (error) throw error
  return { ...match, id: (data as { id: string }).id }
}

export function getMatch(id: string): ArenaMatch | null {
  const all = [...featuredMatches()]
  const found = all.find((m) => m.id === id)
  if (found) return found
  try {
    const raw = localStorage.getItem('flex.arena.' + id)
    return raw ? (JSON.parse(raw) as ArenaMatch) : null
  } catch {
    return null
  }
}

/** Pari communautaire (escrow immédiat de la mise). */
export async function placeBet(matchId: string, side: 'a' | 'b', amount: number, me: Profile): Promise<void> {
  if (DEMO_MODE) {
    await applyArenaDelta(me.id, -amount) // débit immédiat (mise en jeu)
    try {
      localStorage.setItem(`flex.arena.bet.${matchId}`, JSON.stringify({ side, amount }))
    } catch {
      /* quota */
    }
    return
  }
  const { error } = await supabase!.rpc('place_bet', { p_match: matchId, p_side: side, p_amount: amount })
  if (error) throw error
}

/** Règle un pari après résolution du duel (cote x2 si bon camp). */
export async function settleBet(matchId: string, winnerSide: 'a' | 'b', me: Profile): Promise<{ won: boolean; gain: number } | null> {
  if (!DEMO_MODE) return null
  try {
    const raw = localStorage.getItem(`flex.arena.bet.${matchId}`)
    if (!raw) return null
    const bet = JSON.parse(raw) as { side: 'a' | 'b'; amount: number }
    localStorage.removeItem(`flex.arena.bet.${matchId}`)
    const won = bet.side === winnerSide
    if (won) await applyArenaDelta(me.id, bet.amount * 2)
    return { won, gain: won ? bet.amount * 2 : 0 }
  } catch {
    return null
  }
}

/**
 * Règle le duel : crédite/débite la mise selon le vainqueur.
 * Renvoie le delta appliqué au joueur courant.
 */
export async function settleDuel(match: ArenaMatch, aTaps: number, bTaps: number, me: Profile): Promise<number> {
  const meWon = aTaps >= bTaps // le joueur courant est toujours "a"
  const delta = meWon ? match.stake : -match.stake
  if (DEMO_MODE) {
    await applyArenaDelta(me.id, delta)
    return delta
  }
  const { error } = await supabase!.rpc('settle_match', { p_match: match.id, p_a_taps: aTaps, p_b_taps: bTaps })
  if (error) throw error
  return delta
}
