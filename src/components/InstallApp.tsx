import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Apple, ArrowDownToLine, CheckCircle2, Download, Globe, HelpCircle, Plus, Share, Smartphone, X } from 'lucide-react'
import { canInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '@/lib/install'
import { ANDROID_APK_URL, IOS_APP_URL } from '@/lib/appLinks'
import { haptic } from '@/lib/utils'

/**
 * « Télécharger l'application » : propose les 2 apps mobiles (Android APK +
 * iPhone) ET l'installation de la version web (PWA), avec guide pas à pas.
 */
export function InstallApp() {
  const [installable, setInstallable] = useState(canInstall())
  const [installed, setInstalled] = useState(isStandalone())
  const [sheet, setSheet] = useState(false)
  const [guide, setGuide] = useState(false)

  useEffect(
    () =>
      onInstallChange(() => {
        setInstallable(canInstall())
        setInstalled(isStandalone())
      }),
    [],
  )

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isAndroid = /Android/i.test(ua)
  const iOSDevice = isIOS()

  async function installWeb() {
    haptic(12)
    if (installable) {
      const ok = await promptInstall()
      if (ok) setInstalled(true)
      else setGuide(true)
    } else {
      setGuide(true)
    }
  }

  function getIphone() {
    haptic(10)
    if (IOS_APP_URL) window.open(IOS_APP_URL, '_blank')
    else setGuide(true) // pas encore sur l'App Store → on guide vers la PWA
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => { haptic(10); setSheet(true) }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-bold text-gold transition active:scale-[0.98]"
      >
        <Download className="h-4 w-4" /> Télécharger l'application
      </button>
      {installed && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> Version installée sur cet appareil
        </div>
      )}

      <AnimatePresence>
        {sheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet(false)}
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
                  <Download className="h-5 w-5 text-gold" /> Télécharger FLEX
                </h2>
                <button onClick={() => setSheet(false)} className="text-zinc-500"><X className="h-6 w-6" /></button>
              </div>

              <div className="space-y-2.5">
                {/* Android APK */}
                <a
                  href={ANDROID_APK_URL}
                  target="_blank"
                  rel="noopener"
                  onClick={() => haptic(12)}
                  className={
                    'flex items-center gap-3 rounded-2xl border p-3.5 transition active:scale-[0.99] ' +
                    (isAndroid ? 'border-gold/40 bg-gold/[0.07]' : 'border-white/10 bg-white/[0.03]')
                  }
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <Smartphone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">Android — Télécharger l'APK</span>
                    <span className="block text-xs text-zinc-500">Installe le fichier (autorise « Sources inconnues »).</span>
                  </span>
                  <ArrowDownToLine className="h-5 w-5 shrink-0 text-zinc-500" />
                </a>

                {/* iPhone */}
                <button
                  onClick={getIphone}
                  className={
                    'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99] ' +
                    (iOSDevice ? 'border-gold/40 bg-gold/[0.07]' : 'border-white/10 bg-white/[0.03]')
                  }
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-zinc-100">
                    <Apple className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">
                      iPhone {IOS_APP_URL ? '— App Store' : '— Ajouter à l\'écran d\'accueil'}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {IOS_APP_URL ? 'Télécharge depuis l\'App Store.' : 'Installe la version iPhone en 3 gestes.'}
                    </span>
                  </span>
                  <ArrowDownToLine className="h-5 w-5 shrink-0 text-zinc-500" />
                </button>

                {/* Version web (PWA) */}
                <button
                  onClick={() => { setSheet(false); installWeb() }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition active:scale-[0.99]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-flex-cyan/15 text-flex-cyan">
                    <Globe className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">Version web (PWA)</span>
                    <span className="block text-xs text-zinc-500">Installe FLEX directement depuis le navigateur.</span>
                  </span>
                </button>
              </div>

              <button
                onClick={() => { setSheet(false); setGuide(true) }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-zinc-500"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Guide d'installation détaillé
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{guide && <InstallGuide onClose={() => setGuide(false)} ios={iOSDevice} />}</AnimatePresence>
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
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
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
          <button onClick={onClose} className="text-zinc-500"><X className="h-6 w-6" /></button>
        </div>

        {ios ? (
          <ol className="space-y-3">
            <Step n={1}>Ouvre FLEX dans <b>Safari</b> (obligatoire sur iPhone/iPad).</Step>
            <Step n={2}>Touche <b>Partager</b> <Share className="inline h-4 w-4 -translate-y-0.5 text-flex-cyan" /> en bas.</Step>
            <Step n={3}>Choisis <b>« Sur l'écran d'accueil »</b> <Plus className="inline h-4 w-4 -translate-y-0.5 text-flex-cyan" />.</Step>
            <Step n={4}>Touche <b>Ajouter</b> — l'icône FLEX apparaît. ✦</Step>
          </ol>
        ) : (
          <ol className="space-y-3">
            <Step n={1}>Ouvre le lien <b>« Télécharger l'APK »</b> et confirme le téléchargement.</Step>
            <Step n={2}>Ouvre le fichier <b>.apk</b> téléchargé.</Step>
            <Step n={3}>Autorise <b>« Sources inconnues »</b> si demandé.</Step>
            <Step n={4}>Installe — l'icône FLEX s'ajoute à ton téléphone. ✦</Step>
          </ol>
        )}

        <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-gold-grad py-3 text-sm font-bold text-ink-900 active:scale-[0.98]">
          J'ai compris
        </button>
      </motion.div>
    </motion.div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-grad text-xs font-extrabold text-ink-900">{n}</span>
      <span className="text-sm leading-relaxed text-zinc-200">{children}</span>
    </li>
  )
}
