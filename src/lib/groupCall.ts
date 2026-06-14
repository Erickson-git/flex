import { DEMO_MODE, supabase } from './supabase'

export interface RoomMember {
  room_id: string
  user_id: string
  role: 'admin' | 'member'
  name: string | null
  avatar: string | null
  username: string | null
}

export interface SearchResult {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export async function createCallRoom(kind: 'audio' | 'video'): Promise<string | null> {
  if (DEMO_MODE || !supabase) return null
  const { data, error } = await supabase.rpc('create_call_room', { p_kind: kind })
  if (error) throw error
  return data as string
}

export async function joinCallRoom(roomId: string): Promise<void> {
  if (DEMO_MODE || !supabase) return
  const { error } = await supabase.rpc('join_call_room', { p_room: roomId })
  if (error) throw error
}

export async function fetchRoomKind(roomId: string): Promise<'audio' | 'video'> {
  if (DEMO_MODE || !supabase) return 'video'
  const { data } = await supabase.from('call_rooms').select('kind').eq('id', roomId).maybeSingle()
  return (data?.kind as 'audio' | 'video') ?? 'video'
}

export async function fetchRoomMembers(roomId: string): Promise<RoomMember[]> {
  if (DEMO_MODE || !supabase) return []
  const { data } = await supabase.from('call_room_members').select('*').eq('room_id', roomId)
  return (data ?? []) as RoomMember[]
}

export async function kickMember(roomId: string, userId: string): Promise<void> {
  if (!supabase) return
  await supabase.rpc('kick_call_member', { p_room: roomId, p_user: userId })
}

export async function promoteMember(roomId: string, userId: string): Promise<void> {
  if (!supabase) return
  await supabase.rpc('promote_call_admin', { p_room: roomId, p_user: userId })
}

export async function inviteMember(roomId: string, userId: string): Promise<void> {
  if (!supabase) return
  await supabase.rpc('invite_call_member', { p_room: roomId, p_user: userId })
}

export async function searchProfiles(q: string): Promise<SearchResult[]> {
  if (DEMO_MODE || !supabase) return []
  const u = q.trim().toLowerCase()
  if (!u) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${u}%`)
    .limit(10)
  return (data ?? []) as SearchResult[]
}
