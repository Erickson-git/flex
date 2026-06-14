import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Upload utilisateur vers Supabase Storage (bucket "media", public).
// - Images : compressées côté client (max 1280px, JPEG q.82) pour ne pas
//   saturer le stockage ni la bande passante au chargement du feed.
// - Audio / autres : uploadés tels quels avec garde de taille.
// Chemin : <user_id>/<timestamp>.<ext>  → la policy Storage vérifie que le
// 1er segment == auth.uid() (un utilisateur ne peut écrire que chez lui).
// ─────────────────────────────────────────────────────────────

const MAX_BYTES = 15 * 1024 * 1024 // 15 Mo (image / audio)
const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 Mo (vidéo)
const IMAGE_MAX_DIM = 1280

export function isAudioUrl(url?: string | null): boolean {
  return !!url && /\.(mp3|m4a|aac|ogg|oga|wav|weba)(\?|$)/i.test(url)
}

export function isVideoUrl(url?: string | null): boolean {
  return !!url && /\.(mp4|webm|mov|m4v|ogv|3gp|mkv|avi)(\?|$)/i.test(url)
}

export async function uploadMedia(file: File, userId: string): Promise<string> {
  if (!supabase) throw new Error('Backend indisponible')

  let blob: Blob = file
  let ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  let contentType = file.type || 'application/octet-stream'

  if (file.type.startsWith('image/')) {
    blob = await compressImage(file)
    ext = 'jpg'
    contentType = 'image/jpeg'
  }

  const isVideo = file.type.startsWith('video/')
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES
  if (blob.size > limit)
    throw new Error(isVideo ? 'Vidéo trop lourde (max 50 Mo).' : 'Fichier trop lourd (max 15 Mo).')

  const path = `${userId}/${Date.now()}-${Math.floor(performance.now())}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType, upsert: false })
  if (error) throw new Error(error.message || "Upload échoué (bucket 'media' ?)")
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compression'))), 'image/jpeg', 0.82),
    )
  } catch {
    return file // fallback : on uploade l'original si la compression échoue
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Édition d'une image avant publication : recadrage (ratio largeur/hauteur)
 * + filtre CSS, cuits dans un JPEG. ratio null = format d'origine.
 */
export async function processImage(file: File, opts: { filter?: string; ratio?: number | null }): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    let sx = 0
    let sy = 0
    let sw = img.width
    let sh = img.height
    if (opts.ratio) {
      const cur = img.width / img.height
      if (cur > opts.ratio) {
        sw = img.height * opts.ratio
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / opts.ratio
        sy = (img.height - sh) / 2
      }
    }
    const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(sw, sh))
    const w = Math.max(1, Math.round(sw * scale))
    const h = Math.max(1, Math.round(sh * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    if (opts.filter) ctx.filter = opts.filter
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.85))
    if (!blob) return file
    return new File([blob], 'edit.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Découpe une vidéo entre start et end (secondes) en la rejouant et en
 * la ré-enregistrant (MediaRecorder + captureStream). Gratuit, sans lib,
 * mais en temps réel. Fallback : renvoie l'original si non supporté.
 */
export async function trimVideo(file: File, start: number, end: number): Promise<File> {
  try {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.playsInline = true
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res()
      video.onerror = () => rej(new Error('meta'))
    })
    const dur = video.duration || 0
    const s = Math.max(0, start)
    const e = Math.min(end || dur, dur)
    // Pas de vraie découpe → original
    if (!dur || e - s < 0.3 || (s <= 0.05 && e >= dur - 0.05)) {
      URL.revokeObjectURL(url)
      return file
    }
    const vAny = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }
    const capture = vAny.captureStream?.bind(video) ?? vAny.mozCaptureStream?.bind(video)
    if (!capture || typeof MediaRecorder === 'undefined') {
      URL.revokeObjectURL(url)
      return file
    }
    video.currentTime = s
    await new Promise<void>((res) => { video.onseeked = () => res() })
    const stream = capture()
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType: mime })
    const chunks: Blob[] = []
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data) }
    const stopped = new Promise<void>((res) => { rec.onstop = () => res() })
    rec.start()
    await video.play()
    await new Promise<void>((res) => {
      const tick = () => {
        if (video.currentTime >= e || video.ended) res()
        else requestAnimationFrame(tick)
      }
      tick()
    })
    video.pause()
    rec.stop()
    await stopped
    URL.revokeObjectURL(url)
    const blob = new Blob(chunks, { type: 'video/webm' })
    if (!blob.size) return file
    return new File([blob], `trim-${Date.now()}.webm`, { type: 'video/webm' })
  } catch {
    return file
  }
}

/**
 * Découpe automatiquement une vidéo de plus de `maxSec` secondes en plusieurs
 * segments de ≤ `maxSec` chacun (1 min par défaut), DANS L'ORDRE. Réutilise
 * `trimVideo` (rejeu + ré-enregistrement, temps réel). Si la vidéo est courte
 * ou si la découpe n'est pas supportée, renvoie [file] (un seul segment).
 *
 * @param onProgress (i, n) appelé avant chaque segment pour informer l'UI.
 */
export async function splitVideo(
  file: File,
  maxSec = 60,
  onProgress?: (current: number, total: number) => void,
): Promise<File[]> {
  try {
    if (!file.type.startsWith('video/')) return [file]
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.src = url
    v.preload = 'metadata'
    const dur = await new Promise<number>((res, rej) => {
      v.onloadedmetadata = () => res(v.duration || 0)
      v.onerror = () => rej(new Error('meta'))
    })
    // Capture supportée ? Sinon, pas de découpe possible → vidéo entière.
    const vAny = v as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }
    const canCapture = !!(vAny.captureStream || vAny.mozCaptureStream) && typeof MediaRecorder !== 'undefined'
    URL.revokeObjectURL(url)
    if (!dur || dur <= maxSec + 0.5 || !canCapture) return [file]

    const bounds: [number, number][] = []
    for (let s = 0; s < dur - 0.4; s += maxSec) {
      const e = Math.min(s + maxSec, dur)
      if (e - s >= 0.5) bounds.push([s, e]) // on ignore un dernier bout trop court
    }
    const total = bounds.length
    const parts: File[] = []
    for (let i = 0; i < total; i++) {
      onProgress?.(i + 1, total)
      const part = await trimVideo(file, bounds[i][0], bounds[i][1])
      parts.push(part)
    }
    return parts.length ? parts : [file]
  } catch {
    return [file]
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
