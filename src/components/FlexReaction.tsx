import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn, compact, haptic } from '@/lib/utils'

/**
 * Le bouton "Flex" (équivalent du like).
 * Chaque appui déclenche une micro-récompense multi-sensorielle :
 *  - pop + halo lumineux sur l'icône
 *  - particules de flammes qui s'envolent
 *  - vibration haptique
 * C'est la "variable reward" du framework Hook : satisfaisant, légèrement
 * imprévisible (particules aléatoires), et instantané.
 */
export function FlexReaction({
  count,
  liked,
  onToggle,
}: {
  count: number
  liked: boolean
  onToggle: () => void
}) {
  const [bursts, setBursts] = useState<number[]>([])

  function handle() {
    haptic([8, 20, 8])
    if (!liked) setBursts((b) => [...b, Date.now()])
    onToggle()
  }

  return (
    <button
      onClick={handle}
      className={cn(
        'group relative flex items-center gap-1.5 text-sm font-semibold transition',
        liked ? 'text-flex-pink' : 'text-zinc-400 hover:text-zinc-200',
      )}
      aria-pressed={liked}
    >
      <span className="relative grid place-items-center">
        {/* halo qui pulse à l'état liké */}
        {liked && (
          <span className="absolute h-7 w-7 animate-pulse-ring rounded-full bg-flex-pink/40" />
        )}
        <motion.span
          key={liked ? 'on' : 'off'}
          animate={liked ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Flame
            className={cn(
              'h-5 w-5',
              liked && 'fill-flex-pink drop-shadow-[0_0_8px_rgba(255,77,141,0.8)]',
            )}
          />
        </motion.span>

        {/* particules qui s'envolent */}
        <AnimatePresence>
          {bursts.map((id) => (
            <FlameBurst key={id} onDone={() => setBursts((b) => b.filter((x) => x !== id))} />
          ))}
        </AnimatePresence>
      </span>
      <span className="tabular-nums">{compact(count)}</span>
    </button>
  )
}

function FlameBurst({ onDone }: { onDone: () => void }) {
  const particles = [0, 1, 2, 3, 4]
  return (
    <span className="pointer-events-none absolute inset-0">
      {particles.map((i) => {
        const angle = (i / particles.length) * Math.PI - Math.PI / 2
        const dx = Math.cos(angle) * (24 + (i % 2) * 12)
        const dy = -Math.abs(Math.sin(angle) * 40) - 12
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 text-xs"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onAnimationComplete={i === 0 ? onDone : undefined}
          >
            🔥
          </motion.span>
        )
      })}
    </span>
  )
}
