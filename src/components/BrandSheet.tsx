import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownToLine, Apple, Globe, Share2, Smartphone, X } from 'lucide-react'
import { canInstall, isIOS, promptInstall } from '@/lib/install'
import { ANDROID_APK_URL, IOS_APP_URL } from '@/lib/appLinks'
import { BrandLogo } from './BrandLogo'
import { haptic } from '@/lib/utils'

/**
 * Fenêtre ouverte en touchant le nom « FLEX » du flux :
 *  - obtenir l'app sur son téléphone (Android APK / iPhone / version web),
 *  - partager FLEX (le lien mène les nouveaux vers l'inscription / connexion).
 */
export function BrandSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const iOSDevice = isIOS()

  async function shareApp() {
    haptic(12)
    // location.origin → écran d'accueil (créer un compte / se connecter)
    const url = location.origin
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FLEX', text: 'Rejoins-moi sur FLEX ✦ — crée ton compte', url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* annulé */
    }
    onClose()
  }

  async function installWeb() {
    haptic(12)
    if (canInstall()) await promptInstall()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
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
              <BrandLogo size={56} baseline={false} />
              <button onClick={onClose} className="text-zinc-500"><X className="h-6 w-6" /></button>
            </div>

            <h2 className="mb-1 font-display text-lg font-extrabold">Obtiens FLEX sur ton téléphone</h2>
            <p className="mb-4 text-xs text-zinc-500">Installe l'app ou partage-la à tes amis.</p>

            <div className="space-y-2.5">
              {/* Android APK */}
              <a
                href={ANDROID_APK_URL}
                target="_blank"
                rel="noopener"
                onClick={() => haptic(12)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300"><Smartphone className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">Android — Télécharger l'APK</span>
                  <span className="block text-xs text-zinc-500">Installe l'app sur ton téléphone Android.</span>
                </span>
                <ArrowDownToLine className="h-5 w-5 shrink-0 text-zinc-500" />
              </a>

              {/* iPhone */}
              <a
                href={IOS_APP_URL || ANDROID_APK_URL}
                onClick={(e) => {
                  haptic(10)
                  if (!IOS_APP_URL) {
                    e.preventDefault()
                    alert('Sur iPhone : ouvre FLEX dans Safari → bouton Partager → « Sur l\'écran d\'accueil ».')
                    onClose()
                  }
                }}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-zinc-100"><Apple className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">iPhone {IOS_APP_URL ? '— App Store' : '— Écran d\'accueil'}</span>
                  <span className="block text-xs text-zinc-500">{IOS_APP_URL ? 'Télécharge depuis l\'App Store.' : 'Installe en 3 gestes depuis Safari.'}</span>
                </span>
                <ArrowDownToLine className="h-5 w-5 shrink-0 text-zinc-500" />
              </a>

              {/* Version web (PWA) — affichée seulement si possible */}
              {canInstall() && !iOSDevice && (
                <button onClick={installWeb} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left active:scale-[0.99]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-flex-cyan/15 text-flex-cyan"><Globe className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">Installer la version web</span>
                    <span className="block text-xs text-zinc-500">Ajoute FLEX à ton écran d'accueil.</span>
                  </span>
                </button>
              )}

              {/* Partager FLEX */}
              <button onClick={shareApp} className="flex w-full items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.06] p-3.5 text-left active:scale-[0.99]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold"><Share2 className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">Partager FLEX</span>
                  <span className="block text-xs text-zinc-500">Le lien mène tes amis vers l'inscription / connexion.</span>
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
