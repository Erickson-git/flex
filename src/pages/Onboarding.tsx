import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Eye, Loader2, Sparkles } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/store/useAuth'
import { haptic } from '@/lib/utils'

/**
 * Écran d'accueil : mystérieux, luxueux, ultra-court.
 * Objectif = créer le désir en 5 secondes, pas expliquer le produit.
 * Aucun formulaire ici : un seul geste mène à la revendication du pseudo.
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const enterAsGuest = useAuth((s) => s.enterAsGuest)
  const [busy, setBusy] = useState(false)

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-6 py-14">
      {/* halos d'ambiance */}
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-flex-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-40 h-64 w-64 rounded-full bg-flex-pink/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.2em' }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative mt-8 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-zinc-400"
      >
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        Accès anticipé
      </motion.div>

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        {/* Logo animé : l'accueil est l'écran de lancement de l'app. */}
        <BrandLogo size={200} animate />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-7 max-w-xs text-lg leading-relaxed text-zinc-300"
        >
          Brille en public.
          <br />
          <span className="text-zinc-500">Libère-toi en privé.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs text-gold"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
          Les 100 premiers deviennent Pionniers
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.3 }}
        className="relative w-full max-w-sm space-y-3"
      >
        {/* Nouveau compte */}
        <button
          onClick={() => { haptic(15); navigate('/claim') }}
          className="btn-gold flex w-full items-center justify-center gap-2 text-lg"
        >
          Créer mon pseudo
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Compte existant */}
        <button
          onClick={() => { haptic(10); navigate('/signin') }}
          className="w-full rounded-2xl border border-white/15 py-3.5 text-sm font-bold text-white active:scale-[0.98]"
        >
          Se connecter
        </button>

        {/* Invité */}
        <button
          onClick={async () => {
            haptic(10)
            setBusy(true)
            try {
              await enterAsGuest()
              navigate('/app', { replace: true })
            } catch {
              setBusy(false)
            }
          }}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-zinc-400 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Eye className="h-4 w-4" /> Visiter en invité
            </>
          )}
        </button>

        <p className="text-center text-xs text-zinc-600">
          L'invité peut tout regarder ; un pseudo est demandé pour publier ou commenter.
        </p>
      </motion.div>
    </div>
  )
}
