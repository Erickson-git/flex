import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Music2, Pause, Play, X } from 'lucide-react'
import { TRACKS, type Track } from '@/lib/audioLibrary'
import { cn, haptic } from '@/lib/utils'

// Fiche modale pour choisir une piste (musique de Flex, vibe, sonnerie…).
export function TrackPicker({
  selectedId,
  onSelect,
  onClose,
  title = 'Choisis une musique',
  allowNone = true,
}: {
  selectedId?: string | null
  onSelect: (track: Track | null) => void
  onClose: () => void
  title?: string
  allowNone?: boolean
}) {
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function preview(t: Track) {
    haptic(6)
    if (!audioRef.current) audioRef.current = new Audio()
    if (playing === t.id) {
      audioRef.current.pause()
      setPlaying(null)
      return
    }
    audioRef.current.src = t.url
    audioRef.current.play().then(() => setPlaying(t.id)).catch(() => {})
  }

  function pick(t: Track | null) {
    audioRef.current?.pause()
    onSelect(t)
  }

  function close() {
    audioRef.current?.pause()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end bg-ink-900/70 backdrop-blur-sm" onClick={close}>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[78dvh] w-full overflow-hidden rounded-t-3xl"
      >
        <div className="flex items-center justify-between p-4">
          <span className="flex items-center gap-2 font-bold text-white">
            <Music2 className="h-5 w-5 text-gold" /> {title}
          </span>
          <button onClick={close} className="rounded-full p-1 text-zinc-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[62dvh] overflow-y-auto px-3 pb-8">
          {allowNone && (
            <button
              onClick={() => pick(null)}
              className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-400 active:bg-white/5"
            >
              Aucune musique
            </button>
          )}
          {TRACKS.map((t) => (
            <div
              key={t.id}
              className={cn('mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5', selectedId === t.id && 'bg-gold/10')}
            >
              <button
                onClick={() => preview(t)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white active:scale-90"
              >
                {playing === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={() => pick(t)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white">
                {t.title}
              </button>
              {selectedId === t.id && <Check className="h-4 w-4 shrink-0 text-gold" />}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
