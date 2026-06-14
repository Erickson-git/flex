import { DEMO_MODE, supabase } from './supabase'
import { isAudioUrl, isVideoUrl } from './upload'
import { pinHash } from './pin'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// Galerie PRIVÉE de l'utilisateur : tout ce qu'il enregistre (publications,
// médias reçus en message, enregistrements d'appel) est stocké ici, rattaché
// à SON compte (table `saved_media`, RLS self-only) et protégé par un code PIN
// local. Le PIN n'est jamais stocké en clair (empreinte SHA-256 salée).
// ─────────────────────────────────────────────────────────────

export type SavedKind = 'image' | 'video' | 'audio' | 'other'

export interface SavedMedia {
  id: string
  url: string
  kind: SavedKind
  source: string | null
  created_at: string
}

const LS = 'flex.gallery' // repli local (mode démo)

/** Devine le type d'un média à partir de son URL. */
export function mediaKind(url?: string | null): SavedKind {
  if (isVideoUrl(url)) return 'video'
  if (isAudioUrl(url)) return 'audio'
  if (url && /\.(jpe?g|png|gif|webp|avif|bmp|heic)(\?|$)/i.test(url)) return 'image'
  return 'other'
}

/** Enregistre un média dans la galerie privée. */
export async function saveToGallery(input: { url: string; kind?: SavedKind; source?: string | null }): Promise<void> {
  const kind = input.kind ?? mediaKind(input.url)
  const source = input.source ?? null
  if (DEMO_MODE || !supabase) {
    const list = JSON.parse(localStorage.getItem(LS) || '[]') as SavedMedia[]
    list.unshift({ id: uid(), url: input.url, kind, source, created_at: new Date().toISOString() })
    localStorage.setItem(LS, JSON.stringify(list))
    return
  }
  await supabase.from('saved_media').insert({ url: input.url, kind, source })
}

export async function fetchGallery(): Promise<SavedMedia[]> {
  if (DEMO_MODE || !supabase) return JSON.parse(localStorage.getItem(LS) || '[]') as SavedMedia[]
  const { data } = await supabase
    .from('saved_media')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []) as SavedMedia[]
}

export async function removeFromGallery(id: string): Promise<void> {
  if (DEMO_MODE || !supabase) {
    const list = (JSON.parse(localStorage.getItem(LS) || '[]') as SavedMedia[]).filter((m) => m.id !== id)
    localStorage.setItem(LS, JSON.stringify(list))
    return
  }
  await supabase.from('saved_media').delete().eq('id', id)
}

/** Télécharge le fichier sur l'appareil (dossier Téléchargements / galerie du téléphone). */
export async function downloadMedia(url: string, filename?: string): Promise<void> {
  const name = filename || url.split('/').pop()?.split('?')[0] || 'flex-media'
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = obj
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(obj), 4000)
  } catch {
    // CORS / réseau : on ouvre l'URL → l'utilisateur enregistre manuellement.
    window.open(url, '_blank')
  }
}

/** Enregistre dans la galerie privée ET télécharge sur l'appareil (l'action « télécharger »). */
export async function saveAndDownload(url: string, source?: string | null): Promise<void> {
  await saveToGallery({ url, source })
  await downloadMedia(url)
}

// ── Code PIN de la galerie (empreinte locale, jamais en clair) ──────
const PIN_KEY = 'flex.gallery.pin'

export function galleryPinSet(): boolean {
  return !!localStorage.getItem(PIN_KEY)
}

export async function setGalleryPin(pin: string, salt: string): Promise<void> {
  localStorage.setItem(PIN_KEY, await pinHash(pin, 'gallery.' + salt))
}

export async function verifyGalleryPin(pin: string, salt: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY)
  return !!stored && stored === (await pinHash(pin, 'gallery.' + salt))
}
