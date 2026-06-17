import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'

/** Bandeau discret quand l'appareil perd la connexion (utile en réseau faible). */
export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="safe-top fixed inset-x-0 top-0 z-[150] flex items-center justify-center gap-2 bg-flex-pink/90 py-1.5 text-xs font-bold text-white backdrop-blur"
        >
          <WifiOff className="h-3.5 w-3.5" /> Hors connexion — certaines fonctions sont limitées
        </motion.div>
      )}
    </AnimatePresence>
  )
}
