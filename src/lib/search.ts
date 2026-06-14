import { supabase } from './supabase'
import type { Profile } from './types'

// ─────────────────────────────────────────────────────────────
// Recherche de profils : par pseudo, numéro de téléphone, nom affiché ou bio.
// Lecture publique (RLS profiles_read = true) → requête client directe.
// ─────────────────────────────────────────────────────────────

export async function searchProfiles(q: string): Promise<Profile[]> {
  const term = q.trim()
  if (!term || !supabase) return []
  // On neutralise les caractères qui casseraient le filtre `or`.
  const like = `%${term.replace(/[%,()]/g, '')}%`
  // Recherche aussi sur le téléphone normalisé (chiffres seuls) pour qu'un
  // numéro saisi « 90 12 34 56 » retrouve « +22890123456 ».
  const digits = term.replace(/\D/g, '')
  const conds = [
    `username.ilike.${like}`,
    `display_name.ilike.${like}`,
    `bio.ilike.${like}`,
    `phone.ilike.${like}`,
  ]
  if (digits.length >= 3) conds.push(`phone.ilike.%${digits}%`)
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(conds.join(','))
    .order('flex_score', { ascending: false })
    .limit(20)
  return (data ?? []) as Profile[]
}
