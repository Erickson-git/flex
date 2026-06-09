import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { compact, haptic } from '@/lib/utils'

/**
 * "Starification" : à l'arrivée dans le Flow, on montre au nouvel inscrit
 * des gains de popularité qui défilent (followers, Flex reçus). L'objectif
 * est l'effet tapis rouge : « tout le monde te remarque déjà ».
 */
export function StarBoostToast() {
  const [visible, setVisible] = useState(false)
  const [gain, setGain] = useState(0)

  useEffect(() => {
    if (sessionStorage.getItem('flex.boostShown')) return
    sessionStorage.setItem('flex.boostShown', '1')

    const target = 240 + Math.floor((Date.now() % 600))
    let shown = false
    const t1 = setTimeout(() => {
      setVisible(true)
      shown = true
      haptic([10, 40, 10])
    }, 1200)

    // compteur qui grimpe
    let v = 0
    const t2 = setInterval(() => {
      v = Math.min(target, v + Math.ceil(target / 20))
      setGain(v)
      if (v >= target) clearInterval(t2)
    }, 60)

    const t3 = setTimeout(() => shown && setVisible(false), 5200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t3)
      clearInterval(t2)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="safe-top fixed inset-x-0 top-0 z-50 mx-auto max-w-lg px-4 pt-2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-ink-800/90 p-3 shadow-glow backdrop-blur-xl">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold-grad text-ink-900">
              <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Tu fais sensation ✦</div>
              <div className="text-xs text-zinc-400">
                <span className="font-bold text-gold">+{compact(gain)}</span> personnes te
                remarquent à l’instant
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
