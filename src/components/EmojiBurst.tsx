import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { haptic } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Réactions émojis "explosives" plein écran.
// Un provider global expose blast(emoji) : n'importe quel composant
// (Directs, Squads) peut déclencher une pluie d'émojis animée.
// ─────────────────────────────────────────────────────────────

interface BurstCtx {
  blast: (emoji: string) => void
}
const Ctx = createContext<BurstCtx>({ blast: () => {} })

export function useEmojiBurst() {
  return useContext(Ctx)
}

interface Burst {
  id: number
  emoji: string
}

export function EmojiBurstProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([])

  const blast = useCallback((emoji: string) => {
    haptic([10, 30, 10, 30])
    const id = performance.now()
    setBursts((b) => [...b, { id, emoji }])
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400)
  }, [])

  return (
    <Ctx.Provider value={{ blast }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        <AnimatePresence>
          {bursts.map((b) => (
            <BurstField key={b.id} emoji={b.emoji} />
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

function BurstField({ emoji }: { emoji: string }) {
  const particles = Array.from({ length: 14 })
  return (
    <>
      {particles.map((_, i) => {
        const startX = 50 + (((i * 53) % 60) - 30) // %
        const drift = ((i % 5) - 2) * 40
        const size = 28 + (i % 4) * 12
        const delay = (i % 7) * 0.04
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: `${startX}%`, bottom: '-10%', fontSize: size }}
            initial={{ y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{
              y: -window.innerHeight * (0.7 + (i % 3) * 0.1),
              x: drift,
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.2, 1, 0.9],
              rotate: (i % 2 ? 1 : -1) * 60,
            }}
            transition={{ duration: 1.2, delay, ease: 'easeOut' }}
          >
            {emoji}
          </motion.span>
        )
      })}
    </>
  )
}
