import { supabase } from './supabase'

// Suivi : actions follow / unfollow + état (RLS : follows_*_self).
export async function isFollowing(targetId: string, meId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', meId)
    .eq('following_id', targetId)
    .maybeSingle()
  return !!data
}

export async function followUser(targetId: string, meId: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.from('follows').insert({ follower_id: meId, following_id: targetId })
  if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error
}

export async function unfollowUser(targetId: string, meId: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.from('follows').delete().eq('follower_id', meId).eq('following_id', targetId)
  if (error) throw error
}
