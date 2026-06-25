import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Loader2, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/store/useAuth'
import { takeRedirect } from '@/lib/redirect'
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
        <BrandLogo size={200} baseline={false} animate />

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
        {/* 1 · Créer un compte */}
        <button
          onClick={() => { haptic(15); navigate('/claim') }}
          disabled={busy}
          className="btn-gold flex w-full items-center justify-center gap-2 text-lg disabled:opacity-60"
        >
          <UserPlus className="h-5 w-5" />
          Créer un compte
        </button>

        {/* 2 · Compte invité */}
        <button
          onClick={async () => {
            haptic(10)
            setBusy(true)
            try {
              await enterAsGuest()
              navigate(takeRedirect() ?? '/app', { replace: true })
            } catch {
              setBusy(false)
            }
          }}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-flex-cyan/30 bg-flex-cyan/[0.06] py-3.5 text-sm font-bold text-flex-cyan active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Eye className="h-5 w-5" /> Continuer en invité</>}
        </button>

        {/* 3 · Se connecter à un compte existant */}
        <button
          onClick={() => { haptic(10); navigate('/signin') }}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-3.5 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
        >
          <LogIn className="h-5 w-5" />
          J'ai déjà un compte
        </button>

        <p className="text-center text-xs text-zinc-600">
          L'invité peut seulement regarder. Le compte invité disparaît à la
          déconnexion — crée un compte pour interagir et le garder.
        </p>
      </motion.div>
    </div>
  )
}
