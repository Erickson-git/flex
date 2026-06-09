import { Crown, Gem, Sparkles } from 'lucide-react'
import type { Tier } from '@/lib/types'
import { cn, tierLabel } from '@/lib/utils'

/**
 * Badge de statut. Le "Pioneer Status" est la pièce maîtresse de la
 * valorisation des premiers inscrits : ils portent une distinction
 * visible que les retardataires ne pourront jamais obtenir.
 */
export function PioneerBadge({
  tier,
  rank,
  size = 'md',
}: {
  tier: Tier
  rank?: number
  size?: 'sm' | 'md'
}) {
  if (tier === 'member') return null
  const isPioneer = tier === 'pioneer'
  const Icon = isPioneer ? Crown : Gem

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        isPioneer
          ? 'border-gold/40 bg-gold/10 text-gold shadow-glow'
          : 'border-flex-violet/40 bg-flex-violet/10 text-flex-violet',
      )}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {tierLabel(tier)}
      {rank != null && isPioneer && (
        <span className="ml-0.5 inline-flex items-center gap-0.5 opacity-90">
          <Sparkles className="h-2.5 w-2.5" />#{rank}
        </span>
      )}
    </span>
  )
}
