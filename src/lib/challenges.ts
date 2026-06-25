import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Cercle des Défis — gagner un défi débloque une fonctionnalité
// payante pour une durée (table feature_unlocks). Voir challenges.sql.
// ─────────────────────────────────────────────────────────────

export interface Challenge {
  id: string
  creator_id: string
  title: string
  description: string
  reward_feature: string
  reward_days: number
  status: 'open' | 'closed'
  winner_id: string | null
  ends_at: string
  created_at: string
  creator?: { username: string; avatar_url: string | null } | null
}

export interface Participant {
  user_id: string
  username?: string
  avatar_url?: string | null
}

export interface Unlock {
  feature: string
  until: string
}

/** Fonctionnalités payantes débloquables en récompense. */
export const REWARD_FEATURES: { key: string; label: string }[] = [
  { key: 'vip', label: '👑 Statut VIP' },
  { key: 'premium_filters', label: '✨ Filtres premium' },
  { key: 'exclusive_themes', label: '🎨 Thèmes exclusifs' },
  { key: 'spotlight', label: '🔦 Coup de projecteur' },
]

export function featureLabel(key: string): string {
  return REWARD_FEATURES.find((f) => f.key === key)?.label ?? key
}

export async function fetchChallenges(): Promise<Challenge[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('challenges')
    .select('*, creator:profiles!challenges_creator_id_fkey(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as Challenge[]
}

export async function createChallenge(
  input: { title: string; description: string; reward_feature: string; reward_days: number; hours: number },
  creatorId: string,
): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const ends_at = new Date(Date.now() + input.hours * 3_600_000).toISOString()
  const { error } = await supabase.from('challenges').insert({
    creator_id: creatorId,
    title: input.title,
    description: input.description,
    reward_feature: input.reward_feature,
    reward_days: input.reward_days,
    ends_at,
  })
  if (error) throw error
}

export async function joinChallenge(challengeId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: userId })
  if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error
}

export async function fetchParticipants(challengeId: string): Promise<Participant[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('challenge_participants')
    .select('user_id, profiles(username, avatar_url)')
    .eq('challenge_id', challengeId)
  return ((data ?? []) as Array<{ user_id: string; profiles?: { username?: string; avatar_url?: string | null } }>).map(
    (r) => ({ user_id: r.user_id, username: r.profiles?.username, avatar_url: r.profiles?.avatar_url }),
  )
}

export async function declareWinner(challengeId: string, winnerId: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.rpc('declare_challenge_winner', { p_challenge: challengeId, p_winner: winnerId })
  if (error) throw error
}

export async function fetchMyUnlocks(): Promise<Unlock[]> {
  if (!supabase) return []
  try {
    const { data } = await supabase.rpc('my_active_unlocks')
    return (data ?? []) as Unlock[]
  } catch {
    return []
  }
}
