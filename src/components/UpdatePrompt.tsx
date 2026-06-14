import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'

/**
 * Mise à jour « sans réinstallation » (type TikTok / grands réseaux).
 *
 * Le service worker (vite-plugin-pwa, registerType:'prompt') détecte qu'une
 * nouvelle version est en ligne sur Vercel. On sonde toutes les 60 s. Dès
 * qu'une version plus récente est prête, on affiche un toast discret :
 * l'utilisateur tape « Mettre à jour » → le nouveau SW prend le contrôle et
 * la page se recharge sur la dernière version. Aucune désinstallation requise.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Sonde périodique : capte un nouveau déploiement sans rouvrir l'app.
      setInterval(() => registration.update().catch(() => {}), 60_000)
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="safe-bottom fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4"
        >
          <div className="glass flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
              <RefreshCw className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Nouvelle version disponible</p>
              <p className="truncate text-xs text-zinc-400">Mets à jour pour la dernière expérience FLEX.</p>
            </div>
            <button
              onClick={() => updateServiceWorker(true)}
              className="shrink-0 rounded-xl bg-gold-grad px-3.5 py-2 text-sm font-semibold text-ink-900 active:scale-95"
            >
              Mettre à jour
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              aria-label="Plus tard"
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
