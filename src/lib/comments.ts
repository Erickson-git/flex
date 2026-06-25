import { supabase } from './supabase'
import { ensureCanInteract } from './guard'

export interface Comment {
  id: string
  flex_id: string
  author_id: string
  content: string
  created_at: string
  author?: { username: string; display_name: string; avatar_url: string | null } | null
}

export async function fetchComments(flexId: string): Promise<Comment[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('comments')
    .select('*, author:profiles(username, display_name, avatar_url)')
    .eq('flex_id', flexId)
    .order('created_at', { ascending: true })
    .limit(200)
  return (data ?? []) as Comment[]
}

export async function addComment(flexId: string, content: string, userId: string): Promise<Comment> {
  ensureCanInteract()
  if (!supabase) throw new Error('Backend indisponible')
  const { data, error } = await supabase
    .from('comments')
    .insert({ flex_id: flexId, author_id: userId, content: content.slice(0, 280) })
    .select('*, author:profiles(username, display_name, avatar_url)')
    .single()
  if (error) throw error
  return data as Comment
}
