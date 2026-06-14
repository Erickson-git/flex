import { DEMO_MODE, supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// « Mon IA » — couche client de l'agent autoclonable (cf. agents.sql).
// Lecture seule pour l'instant : niveau / XP / persona. Le chat et les
// suggestions arriveront via une Edge Function (cerveau LLM).
// Dégrade proprement si agents.sql n'a pas encore été exécuté.
// ─────────────────────────────────────────────────────────────

export interface Agent {
  user_id: string
  name: string
  level: number
  xp: number
  persona: Record<string, unknown>
}

const XP_PER_LEVEL = 100

export function levelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL
}

export async function fetchMyAgent(userId: string): Promise<Agent | null> {
  if (DEMO_MODE) return { user_id: userId, name: 'Mon IA', level: 1, xp: 30, persona: {} }
  try {
    const { data } = await supabase!
      .from('agents')
      .select('user_id, name, level, xp, persona')
      .eq('user_id', userId)
      .maybeSingle()
    return (data as Agent) ?? null
  } catch {
    return null // table absente : agents.sql pas encore exécuté
  }
}
