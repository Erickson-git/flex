import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Zap } from 'lucide-react'
import { getSpotlight } from '@/lib/orchestrator'
import { useEconomy } from '@/store/useEconomy'

/**
 * Bannière "Coup de Projecteur" : visible quand le Chef d'Orchestre a
 * activé un boost de 15 min. Crée un sentiment de moment exceptionnel.
 */
export function SpotlightBanner() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, getSpotlight().expires_at - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  if (left <= 0) return null
  const min = Math.floor(left / 60000)
  const sec = Math.floor((left % 60000) / 1000)
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-gold/40 bg-gold/10 p-3 shadow-glow"
    >
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gold-grad text-ink-900">
        <span className="absolute h-10 w-10 animate-pulse-ring rounded-full bg-gold/40" />
        <Zap className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <div className="text-sm font-bold text-gold">Coup de Projecteur actif ✦</div>
        <div className="text-xs text-zinc-300">
          Ton prochain post est propulsé · {min}:{sec.toString().padStart(2, '0')}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Aversion à la perte : si l'utilisateur a été inactif > 48 h, on l'avertit
 * que son prestige s'érode et que ses Sparks vont expirer. (Sur web, la vraie
 * notification différée nécessite un cron serveur — voir apply_decay + README.)
 */
export function LossAversionBanner() {
  const wallet = useEconomy((s) => s.wallet)
  const [dismissed, setDismissed] = useState(false)
  if (!wallet || dismissed) return null
  const idleMs = Date.now() - new Date(wallet.last_active).getTime()
  if (idleMs < 48 * 3600_000) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mx-4 mt-4 rounded-2xl border border-flex-pink/40 bg-flex-pink/10 p-3"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-flex-pink">
          <Sparkles className="h-4 w-4" />
          Ton prestige s’estompe…
        </div>
        <p className="mt-1 text-xs text-zinc-300">
          48 h d’absence : tes Sparks commencent à expirer et ton rang faiblit.
          Poste maintenant pour stopper l’érosion.
        </p>
        <button onClick={() => setDismissed(true)} className="mt-2 text-xs font-semibold text-zinc-500">
          J’ai compris
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
