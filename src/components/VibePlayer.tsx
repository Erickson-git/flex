import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Music, Pause, Play } from 'lucide-react'
import { haptic } from '@/lib/utils'

/** Convertit un lien public en URL d'embed lisible en iframe. */
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('spotify')) {
      // open.spotify.com/track/ID → /embed/track/ID
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`
    }
    if (u.hostname.includes('soundcloud')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23e8c97a&auto_play=true&hide_related=true&visual=false`
    }
    // AudioMack & autres : pas d'embed universel fiable → lien externe.
    return null
  } catch {
    return null
  }
}

/**
 * Vibe Audio : lecteur épuré. Tap pour lancer l'ambiance sonore d'un profil
 * (ou d'un duel). Embarque Spotify/SoundCloud ; sinon ouvre le lien.
 */
export function VibePlayer({ url, label }: { url?: string | null; label?: string }) {
  const [playing, setPlaying] = useState(false)
  if (!url) return null
  const embed = embedUrl(url)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60">
      <button
        onClick={() => {
          haptic(10)
          if (embed) setPlaying((p) => !p)
          else window.open(url, '_blank')
        }}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-flex-pink to-flex-violet text-white">
          {embed ? playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <Music className="h-3.5 w-3.5 text-flex-pink" />
            {label ?? 'Vibe du moment'}
          </div>
          <div className="truncate text-xs text-zinc-500">{url.replace(/^https?:\/\//, '')}</div>
        </div>
        {embed && playing && (
          <span className="flex items-end gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 rounded bg-flex-pink"
                animate={{ height: [4, 14, 6, 16, 4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </span>
        )}
      </button>

      <AnimatePresence>
        {embed && playing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <iframe
              title="Vibe"
              src={embed}
              className="w-full border-0"
              height={url.includes('spotify') ? 152 : 120}
              allow="autoplay; encrypted-media; clipboard-write"
              loading="lazy"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
