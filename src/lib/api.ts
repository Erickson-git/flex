import { DEMO_MODE, supabase } from './supabase'
import {
  DEMO_FLEXES,
  DEMO_PROFILES,
  DEMO_THREADS,
  DM_SEED,
  SQUAD_SEED_MESSAGES,
} from './demoData'
import type { ChatMessage, DirectThread, Flex, Profile, SecretMessage } from './types'
import { dicebear } from './media'
import { starterBoost, tierFromRank, uid } from './utils'

// ─────────────────────────────────────────────────────────────
// API unifiée. En MODE DÉMO tout est servi depuis localStorage +
// données factices. Sinon, on tape Supabase. Le reste de l'app
// n'a jamais à savoir lequel des deux est actif.
// ─────────────────────────────────────────────────────────────

const LS = {
  session: 'flex.session',
  profiles: 'flex.profiles',
  flexes: 'flex.flexes',
  likes: 'flex.likes',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota — ignore */
  }
}

// ── Démo : initialisation paresseuse du "monde" ────────────────
function demoProfiles(): Profile[] {
  const stored = read<Profile[] | null>(LS.profiles, null)
  if (stored) return stored
  write(LS.profiles, DEMO_PROFILES)
  return DEMO_PROFILES
}
function demoFlexes(): Flex[] {
  const stored = read<Flex[] | null>(LS.flexes, null)
  if (stored) return stored
  write(LS.flexes, DEMO_FLEXES)
  return DEMO_FLEXES
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

export async function getCurrentProfile(): Promise<Profile | null> {
  if (DEMO_MODE) return read<Profile | null>(LS.session, null)
  const { data } = await supabase!.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()
  return (profile as Profile) ?? null
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const u = username.trim().toLowerCase()
  if (DEMO_MODE) {
    return !demoProfiles().some((p) => p.username === u)
  }
  const { count } = await supabase!
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', u)
  return (count ?? 0) === 0
}

/**
 * Inscription "ultra-rapide" : on ne demande qu'un pseudo.
 * Le rang d'inscription (et donc le tier Pionnier/Fondateur) est
 * attribué automatiquement → moteur de rareté.
 */
export async function claimUsername(username: string, displayName?: string): Promise<Profile> {
  const u = username.trim().toLowerCase()

  if (DEMO_MODE) {
    const profiles = demoProfiles()
    const rank = profiles.length + 1
    const boost = starterBoost() // "Starification" : popularité de départ simulée
    const me: Profile = {
      id: uid(),
      username: u,
      display_name: displayName?.trim() || u,
      avatar_url: dicebear(u),
      bio: null,
      tier: tierFromRank(rank),
      joined_rank: rank,
      followers_count: boost.followers,
      following_count: 6,
      flex_score: boost.score,
      created_at: new Date().toISOString(),
    }
    write(LS.profiles, [...profiles, me])
    write(LS.session, me)
    return me
  }

  // — Supabase : connexion anonyme + création du profil via RPC —
  const { data: auth, error: authErr } = await supabase!.auth.signInAnonymously()
  if (authErr || !auth.user) throw authErr ?? new Error('Auth échouée')

  const { data, error } = await supabase!.rpc('claim_username', {
    p_username: u,
    p_display_name: displayName?.trim() || u,
  })
  if (error) throw error
  return data as Profile
}

/** Met à jour des champs du profil courant (titre otaku, thème, musique…). */
export async function updateMyProfile(me: Profile, patch: Partial<Profile>): Promise<Profile> {
  const updated: Profile = { ...me, ...patch }
  if (DEMO_MODE) {
    write(LS.session, updated)
    const profiles = demoProfiles().map((p) => (p.id === me.id ? updated : p))
    write(LS.profiles, profiles)
    return updated
  }
  const { data, error } = await supabase!
    .from('profiles')
    .update(patch)
    .eq('id', me.id)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function signOut(): Promise<void> {
  if (DEMO_MODE) {
    localStorage.removeItem(LS.session)
    return
  }
  await supabase!.auth.signOut()
}

// ═══════════════════════════════════════════════════════════════
// FLEX FLOW (fil public)
// ═══════════════════════════════════════════════════════════════

/** Tri "Flex Flow" : récence + popularité → on remonte ce qui bouge. */
function flowScore(f: Flex): number {
  const ageMin = (Date.now() - new Date(f.created_at).getTime()) / 60000
  const recency = Math.max(0, 120 - ageMin) // bonus sur 2 h
  return f.likes_count * 0.5 + f.comments_count * 1.2 + recency * 3
}

export async function fetchFlow(): Promise<Flex[]> {
  if (DEMO_MODE) {
    const likes = read<Record<string, boolean>>(LS.likes, {})
    return [...demoFlexes()]
      .map((f) => ({ ...f, liked_by_me: !!likes[f.id] }))
      .sort((a, b) => flowScore(b) - flowScore(a))
  }
  const { data, error } = await supabase!
    .from('flexes')
    .select('*, author:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(80)
  if (error) throw error
  return ((data ?? []) as Flex[]).sort((a, b) => flowScore(b) - flowScore(a))
}

export async function createFlex(content: string, mediaUrl: string | null, me: Profile): Promise<Flex> {
  if (DEMO_MODE) {
    // Starification : le post du nouvel inscrit démarre déjà "chaud".
    const seedLikes = 40 + Math.floor(Date.now() % 120)
    const flex: Flex = {
      id: uid(),
      author_id: me.id,
      author: me,
      content,
      media_url: mediaUrl,
      likes_count: seedLikes,
      comments_count: Math.floor(seedLikes / 6),
      created_at: new Date().toISOString(),
      liked_by_me: false,
      boosted: true,
    }
    write(LS.flexes, [flex, ...demoFlexes()])
    return flex
  }
  const { data, error } = await supabase!
    .from('flexes')
    .insert({ author_id: me.id, content, media_url: mediaUrl })
    .select('*, author:profiles(*)')
    .single()
  if (error) throw error
  return data as Flex
}

/** Like / "Flex" optimiste. Renvoie le nouvel état liké. */
export async function toggleFlexLike(flexId: string, currentlyLiked: boolean): Promise<boolean> {
  if (DEMO_MODE) {
    const likes = read<Record<string, boolean>>(LS.likes, {})
    const next = !currentlyLiked
    likes[flexId] = next
    write(LS.likes, likes)
    const flexes = demoFlexes().map((f) =>
      f.id === flexId ? { ...f, likes_count: Math.max(0, f.likes_count + (next ? 1 : -1)) } : f,
    )
    write(LS.flexes, flexes)
    return next
  }
  if (currentlyLiked) {
    await supabase!.from('flex_likes').delete().eq('flex_id', flexId)
    return false
  }
  await supabase!.from('flex_likes').insert({ flex_id: flexId })
  return true
}

/** Partage : incrémente le compteur (signal fort pour Trends). */
export async function shareFlex(flexId: string): Promise<void> {
  if (DEMO_MODE) {
    const flexes = demoFlexes().map((f) =>
      f.id === flexId ? { ...f, shares_count: (f.shares_count ?? 0) + 1 } : f,
    )
    write(LS.flexes, flexes)
    return
  }
  await supabase!.rpc('record_share', { p_post: flexId })
}

/** Vue + temps de rétention agrégé (moteur de recommandation). */
export async function recordView(flexId: string, dwellMs: number): Promise<void> {
  if (DEMO_MODE) {
    const flexes = demoFlexes().map((f) =>
      f.id === flexId
        ? { ...f, views_count: (f.views_count ?? 0) + 1, dwell_ms_total: (f.dwell_ms_total ?? 0) + Math.max(0, dwellMs) }
        : f,
    )
    write(LS.flexes, flexes)
    return
  }
  await supabase!.rpc('record_view', { p_post: flexId, p_dwell_ms: Math.round(dwellMs) })
}

// ═══════════════════════════════════════════════════════════════
// THE HIDEOUTS (messages éphémères)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// CHAT (Squads + Directs partagent le même moteur "room")
// roomId : "sq_*" pour un Squad, "dm_*" pour un Direct.
// ═══════════════════════════════════════════════════════════════

const roomKey = (id: string) => `flex.room.${id}`

function seedRoom(roomId: string, me: Profile): ChatMessage[] {
  const base = Date.now() - 1000 * 60 * 30
  const make = (author_id: string, author_name: string, content: string, i: number, media?: string | null): ChatMessage => ({
    id: uid(),
    room_id: roomId,
    author_id,
    author_name,
    author_avatar: dicebear(author_name),
    content,
    media_url: media ?? null,
    reaction: null,
    created_at: new Date(base + i * 90_000).toISOString(),
  })

  if (roomId.startsWith('dm_')) {
    const thread = DEMO_THREADS.find((t) => t.id === roomId)
    const seed = DM_SEED[roomId] ?? []
    return seed.map((m, i) =>
      m.mine
        ? make(me.id, me.display_name, m.text, i, m.media)
        : make(thread?.peer.id ?? roomId, thread?.peer.display_name ?? 'FLEX', m.text, i, m.media),
    )
  }

  const seed = SQUAD_SEED_MESSAGES[roomId] ?? []
  return seed.map((m, i) => make('seed_' + m.name, m.name, m.text, i))
}

export async function fetchRoomMessages(roomId: string, me: Profile): Promise<ChatMessage[]> {
  if (DEMO_MODE) {
    const existing = read<ChatMessage[] | null>(roomKey(roomId), null)
    if (existing) return existing
    const seeded = seedRoom(roomId, me)
    write(roomKey(roomId), seeded)
    return seeded
  }
  const { data, error } = await supabase!
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return (data ?? []) as ChatMessage[]
}

export async function sendRoomMessage(
  roomId: string,
  content: string,
  media: string | null,
  me: Profile,
): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: uid(),
    room_id: roomId,
    author_id: me.id,
    author_name: me.display_name,
    author_avatar: me.avatar_url,
    content,
    media_url: media,
    reaction: null,
    created_at: new Date().toISOString(),
  }
  if (DEMO_MODE) {
    const all = read<ChatMessage[]>(roomKey(roomId), [])
    write(roomKey(roomId), [...all, msg])
    // notifie les autres onglets / abonnés
    window.dispatchEvent(new CustomEvent('flex:room', { detail: roomId }))
    return msg
  }
  const { data, error } = await supabase!
    .from('chat_messages')
    .insert({
      room_id: roomId,
      author_id: me.id,
      author_name: me.display_name,
      author_avatar: me.avatar_url,
      content,
      media_url: media,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as ChatMessage
}

/** Abonnement temps réel. Renvoie une fonction de désinscription. */
export function subscribeRoom(roomId: string, onChange: () => void): () => void {
  if (DEMO_MODE) {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === roomId) onChange()
    }
    window.addEventListener('flex:room', handler)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('flex:room', handler)
      window.removeEventListener('storage', onChange)
    }
  }
  const channel = supabase!
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}

export async function fetchThreads(): Promise<DirectThread[]> {
  if (DEMO_MODE) return DEMO_THREADS
  // En prod, à dériver des conversations chat_messages (dm_*).
  return DEMO_THREADS
}

const hideoutKey = (id: string) => `flex.hideout.${id}`

export async function fetchSecretMessages(hideoutId: string): Promise<SecretMessage[]> {
  const now = Date.now()
  if (DEMO_MODE) {
    const msgs = read<SecretMessage[]>(hideoutKey(hideoutId), [])
    const alive = msgs.filter((m) => m.expires_at > now)
    if (alive.length !== msgs.length) write(hideoutKey(hideoutId), alive)
    return alive
  }
  const { data, error } = await supabase!
    .from('secret_messages')
    .select('*')
    .eq('hideout_id', hideoutId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SecretMessage[]
}

export async function sendSecretMessage(
  hideoutId: string,
  content: string,
  ttlSeconds: number,
  me: Profile,
): Promise<SecretMessage> {
  const msg: SecretMessage = {
    id: uid(),
    hideout_id: hideoutId,
    author_id: me.id,
    author_name: me.display_name,
    content,
    created_at: new Date().toISOString(),
    expires_at: Date.now() + ttlSeconds * 1000,
  }
  if (DEMO_MODE) {
    const msgs = read<SecretMessage[]>(hideoutKey(hideoutId), [])
    write(hideoutKey(hideoutId), [...msgs, msg])
    return msg
  }
  const { data, error } = await supabase!
    .from('secret_messages')
    .insert({
      hideout_id: hideoutId,
      author_id: me.id,
      author_name: me.display_name,
      content,
      expires_at: new Date(msg.expires_at).toISOString(),
    })
    .select('*')
    .single()
  if (error) throw error
  return data as SecretMessage
}
