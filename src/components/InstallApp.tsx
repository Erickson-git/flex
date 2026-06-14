import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Share, Plus, X, HelpCircle, CheckCircle2, Smartphone } from 'lucide-react'
import { canInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '@/lib/install'
import { haptic } from '@/lib/utils'

/**
 * Carte « Télécharger l'application » (installation PWA) + guide d'installation.
 * - Android/Chrome/Edge : bouton qui déclenche l'invite native.
 * - iPhone/iPad (Safari) : pas d'invite → on ouvre le guide manuel.
 * - Déjà installée : on affiche une confirmation.
 */
export function InstallApp() {
  const [installable, setInstallable] = useState(canInstall())
  const [installed, setInstalled] = useState(isStandalone())
  const [guide, setGuide] = useState(false)

  useEffect(() => onInstallChange(() => {
    setInstallable(canInstall())
    setInstalled(isStandalone())
  }), [])

  if (installed) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm font-semibold text-emerald-300">
        <CheckCircle2 className="h-4 w-4" /> Application installée
      </div>
    )
  }

  async function download() {
    haptic(12)
    if (installable) {
      const ok = await promptInstall()
      if (ok) setInstalled(true)
      else setGuide(true) // refusée / non gérée → on montre le guide
    } else {
      setGuide(true) // iOS ou navigateur sans invite → guide manuel
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={download}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-bold text-gold transition active:scale-[0.98]"
      >
        <Download className="h-4 w-4" /> Télécharger l'application
      </button>
      <button
        onClick={() => { haptic(8); setGuide(true) }}
        className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-zinc-500 active:scale-[0.98]"
      >
        <HelpCircle className="h-3.5 w-3.5" /> Guide d'installation
      </button>

      <AnimatePresence>
        {guide && <InstallGuide onClose={() => setGuide(false)} ios={isIOS()} />}
      </AnimatePresence>
    </div>
  )
}

function InstallGuide({ onClose, ios }: { onClose: () => void; ios: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md rounded-t-3xl border-t border-white/10 bg-ink-800/95 p-6 backdrop-blur-xl sm:rounded-3xl sm:border"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Smartphone className="h-5 w-5 text-gold" /> Installer FLEX
          </h2>
          <button onClick={onClose} className="text-zinc-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-400">
          FLEX s'installe comme une vraie application — pas besoin de store. Elle
          s'ouvre en plein écran, se met à jour toute seule et reçoit les
          notifications.
        </p>

        {ios ? (
          <ol className="space-y-3">
            <Step n={1}>
              Ouvre FLEX dans <b>Safari</b> (obligatoire sur iPhone/iPad).
            </Step>
            <Step n={2}>
              Touche l'icône <b>Partager</b>{' '}
              <Share className="inline h-4 w-4 -translate-y-0.5 text-flex-cyan" /> en bas
              de l'écran.
            </Step>
            <Step n={3}>
              Choisis <b>« Sur l'écran d'accueil »</b>{' '}
              <Plus className="inline h-4 w-4 -translate-y-0.5 text-flex-cyan" />.
            </Step>
            <Step n={4}>
              Touche <b>Ajouter</b> — l'icône FLEX apparaît sur ton écran d'accueil. ✦
            </Step>
          </ol>
        ) : (
          <ol className="space-y-3">
            <Step n={1}>
              Ouvre FLEX dans <b>Chrome</b> (ou Edge / Samsung Internet).
            </Step>
            <Step n={2}>
              Touche le bouton <b>« Télécharger l'application »</b> ci-dessus, ou le
              menu <b>⋮</b> du navigateur.
            </Step>
            <Step n={3}>
              Choisis <b>« Installer l'application »</b> /{' '}
              <b>« Ajouter à l'écran d'accueil »</b>.
            </Step>
            <Step n={4}>Confirme — l'icône FLEX s'ajoute à ton téléphone. ✦</Step>
          </ol>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-gold-grad py-3 text-sm font-bold text-ink-900 active:scale-[0.98]"
        >
          J'ai compris
        </button>
      </motion.div>
    </motion.div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-grad text-xs font-extrabold text-ink-900">
        {n}
      </span>
      <span className="text-sm leading-relaxed text-zinc-200">{children}</span>
    </li>
  )
}
