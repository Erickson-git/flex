import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────
// Chat flottant « live TikTok » par-dessus l'appel vidéo : chaque nouveau
// message apparaît en bas, monte, puis disparaît au bout de quelques secondes.
// Purement décoratif (pointer-events-none) : la saisie reste dans le panneau.
// ─────────────────────────────────────────────────────────────

export interface OverlayLine {
  id: string
  name?: string
  text: string
  mine?: boolean
}

export function CallChatOverlay({ lines }: { lines: OverlayLine[] }) {
  const [visible, setVisible] = useState<OverlayLine[]>([])
  const seen = useRef(0)

  useEffect(() => {
    if (lines.length <= seen.current) {
      seen.current = lines.length
      return
    }
    // Ajoute les nouveaux messages (depuis le dernier vu), garde les 6 derniers.
    const fresh = lines.slice(seen.current)
    seen.current = lines.length
    setVisible((v) => [...v, ...fresh].slice(-6))
    // Auto-disparition de chaque nouveau message après ~7 s.
    const timers = fresh.map((f) =>
      window.setTimeout(() => setVisible((v) => v.filter((x) => x.id !== f.id)), 7000),
    )
    return () => timers.forEach((t) => clearTimeout(t))
  }, [lines])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-36 z-10 flex flex-col justify-end gap-1.5 px-4">
      <AnimatePresence initial={false}>
        {visible.map((m) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="max-w-[80%] self-start rounded-2xl bg-ink-900/55 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
          >
            {m.name && <span className={m.mine ? 'font-bold text-gold' : 'font-bold text-flex-cyan'}>{m.name} </span>}
            <span className="text-zinc-100">{m.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
