import { supabase } from './supabase'
import type { Profile } from './types'

// Édition du profil de l'utilisateur courant (RLS : profiles_update_self).
export async function updateMyProfile(
  userId: string,
  updates: {
    display_name?: string
    bio?: string | null
    phone?: string | null
    avatar_url?: string | null
    cover_url?: string | null
    is_private?: boolean
  },
): Promise<Profile> {
  if (!supabase) throw new Error('Backend indisponible')
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select('*').single()
  if (error) throw error
  return data as Profile
}

/** Charge un profil réel par pseudo (null si introuvable). */
export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle()
  return (data as Profile) ?? null
}
