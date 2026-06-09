import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Sparkle } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { haptic } from '@/lib/utils'

/**
 * Check-in quotidien. La série (streak) est le moteur d'habitude : revenir
 * chaque jour rapporte des Sparks croissants — et tout casser fait mal.
 */
export function DailyCheckIn() {
  const me = useAuth((s) => s.me)
  const wallet = useEconomy((s) => s.wallet)
  const checkin = useEconomy((s) => s.checkin)
  const [reward, setReward] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  if (!me || !wallet) return null
  const today = new Date().toISOString().slice(0, 10)
  const done = wallet.last_checkin === today

  async function claim() {
    if (done || busy) return
    setBusy(true)
    haptic([10, 30, 10, 30])
    try {
      const r = await checkin(me!.id)
      setReward(r.reward)
      setTimeout(() => setReward(null), 2600)
    } catch {
      /* déjà validé */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-ink-700 to-ink-800 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-flex-pink">
          <Flame className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white">
            Série de {wallet.streak_days} jour{wallet.streak_days > 1 ? 's' : ''} 🔥
          </div>
          <div className="text-xs text-zinc-400">
            {done ? 'Reviens demain pour ne pas casser ta série.' : 'Valide ta journée et empoche des Sparks.'}
          </div>
        </div>
        <button
          onClick={claim}
          disabled={done || busy}
          className="flex items-center gap-1 rounded-full bg-gold-grad px-4 py-2 text-sm font-bold text-ink-900 transition active:scale-95 disabled:opacity-40"
        >
          <Sparkle className="h-4 w-4" />
          {done ? 'Validé' : 'Récupérer'}
        </button>
      </div>

      <AnimatePresence>
        {reward != null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -4, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute right-4 top-1 text-sm font-extrabold text-flex-cyan"
          >
            +{reward} ✦
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
