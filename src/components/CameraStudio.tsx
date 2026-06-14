import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import { cn, haptic } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Caméra + filtres temps réel — 100 % canvas/CSS, sans SDK ni modèle.
// Léger (aucun téléchargement), tourne sur téléphones d'entrée de gamme.
// L'AR à suivi de visage (DeepAR/MediaPipe) sera l'upgrade premium.
// ─────────────────────────────────────────────────────────────

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: 'none', label: 'Aucun', css: 'none' },
  { id: 'beaute', label: 'Beauté', css: 'brightness(1.08) contrast(1.05) saturate(1.1) blur(0.4px)' },
  { id: 'luxe', label: 'Luxe', css: 'brightness(1.12) contrast(1.1) sepia(0.15) saturate(1.2)' },
  { id: 'manga', label: 'Manga', css: 'contrast(1.5) saturate(1.45) brightness(1.05)' },
  { id: 'neon', label: 'Néon', css: 'contrast(1.3) saturate(1.8) hue-rotate(-12deg)' },
  { id: 'nb', label: 'N&B', css: 'grayscale(1) contrast(1.12)' },
]

export function CameraStudio({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [filter, setFilter] = useState(FILTERS[1])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const stop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    async function start() {
      stop()
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        setError("Caméra inaccessible. Autorise l'accès, ou importe depuis la galerie.")
      }
    }
    start()
    return () => {
      cancelled = true
      stop()
    }
  }, [facing])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return
    haptic([10, 30, 10])
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (filter.css !== 'none') ctx.filter = filter.css
    if (facing === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1) // miroir : rendu naturel pour un selfie
    }
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `cam-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <button onClick={onClose} className="safe-top absolute right-4 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white">
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="grid h-full place-items-center px-8 text-center text-sm text-zinc-400">{error}</div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{
              filter: filter.css === 'none' ? undefined : filter.css,
              transform: facing === 'user' ? 'scaleX(-1)' : undefined,
            }}
          />
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
              filter.id === f.id ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-zinc-300',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contrôles capture */}
      <div className="safe-bottom flex items-center justify-center gap-10 px-6 pb-6">
        <button
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white active:scale-90"
          aria-label="Changer de caméra"
        >
          <RefreshCw className="h-6 w-6" />
        </button>
        <button
          onClick={capture}
          disabled={!!error}
          className="grid h-18 w-18 place-items-center rounded-full bg-gold-grad text-ink-900 shadow-glow active:scale-90 disabled:opacity-40"
          style={{ height: 72, width: 72 }}
          aria-label="Capturer"
        >
          <Camera className="h-8 w-8" />
        </button>
        <div className="h-12 w-12" />
      </div>
    </div>
  )
}
