import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { LIVE_TICKER } from '@/lib/demoData'

/**
 * Bandeau d'activité "en direct". Le mouvement permanent crée la
 * sensation que le réseau ne dort jamais ("effet boîte de nuit pleine").
 */
export function LiveTicker() {
  const items = [...LIVE_TICKER, ...LIVE_TICKER]
  return (
    <div className="relative flex items-center gap-2 overflow-hidden border-y border-white/5 bg-white/[0.02] py-2">
      <span className="z-10 flex shrink-0 items-center gap-1.5 bg-ink-900/80 pl-4 pr-2 text-xs font-bold uppercase tracking-widest text-flex-pink">
        <Radio className="h-3.5 w-3.5 animate-pulse" />
        Live
      </span>
      <motion.div
        className="flex shrink-0 gap-8 whitespace-nowrap text-sm text-zinc-400"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
