import { Award, Crown, Rocket, Star } from 'lucide-react'
import type { Prestige } from '@/lib/types'
import { cn, prestigeFromScore } from '@/lib/utils'

const ICON: Record<Prestige, typeof Star> = {
  rookie: Rocket,
  vanguard: Award,
  star: Star,
  legende: Crown,
}

const STYLE: Record<Prestige, string> = {
  rookie: 'border-zinc-600 bg-zinc-700/30 text-zinc-300',
  vanguard: 'border-flex-cyan/40 bg-flex-cyan/10 text-flex-cyan',
  star: 'border-flex-pink/40 bg-flex-pink/10 text-flex-pink shadow-glow-pink',
  legende: 'border-gold/50 bg-gold/10 text-gold shadow-glow',
}

/** Badge de prestige basé sur la popularité (flex_score). */
export function PrestigeBadge({
  score,
  size = 'md',
}: {
  score: number
  size?: 'sm' | 'md'
}) {
  const meta = prestigeFromScore(score)
  const Icon = ICON[meta.key]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        STYLE[meta.key],
      )}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {meta.label}
    </span>
  )
}
