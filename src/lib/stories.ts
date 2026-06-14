import { DEMO_MODE, supabase } from './supabase'
import type { Profile } from './types'

export interface Story {
  id: string
  author_id: string
  media_url: string | null
  kind: 'image' | 'video' | 'text'
  content: string | null
  bg: string | null
  created_at: string
  expires_at: string
  author?: Profile
}

export interface StoryGroup {
  author_id: string
  author?: Profile
  stories: Story[]
}

export async function postStory(s: {
  mediaUrl?: string | null
  kind: 'image' | 'video' | 'text'
  content?: string | null
  bg?: string | null
}): Promise<void> {
  if (DEMO_MODE || !supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const { error } = await supabase.from('stories').insert({
    author_id: data.user.id,
    media_url: s.mediaUrl ?? null,
    kind: s.kind,
    content: s.content ?? null,
    bg: s.bg ?? null,
  })
  if (error) throw error
}

export async function fetchActiveStories(): Promise<Story[]> {
  if (DEMO_MODE || !supabase) return []
  const { data } = await supabase
    .from('stories')
    .select('*, author:profiles!author_id(*)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
  return (data ?? []) as Story[]
}

export async function deleteStory(id: string): Promise<void> {
  if (DEMO_MODE || !supabase) return
  await supabase.from('stories').delete().eq('id', id)
}

/** Regroupe les stories par auteur (le plus récent d'auteur en dernier). */
export function groupStories(list: Story[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>()
  for (const s of list) {
    const g = map.get(s.author_id) ?? { author_id: s.author_id, author: s.author, stories: [] }
    g.stories.push(s)
    g.author = g.author ?? s.author
    map.set(s.author_id, g)
  }
  return [...map.values()]
}
