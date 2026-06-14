import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import { signInWithEmail } from '@/lib/account'
import { useAuth } from '@/store/useAuth'
import { BrandLogo } from '@/components/BrandLogo'
import { haptic } from '@/lib/utils'

/** Connexion sécurisée : pseudo (ou email) + mot de passe — tous deux obligatoires. */
export default function SignIn() {
  const navigate = useNavigate()
  const bootstrap = useAuth((s) => s.bootstrap)
  const [ident, setIdent] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = ident.trim().length > 0 && pwd.length > 0 && !busy

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      const id = ident.trim()
      const email = id.includes('@') ? id : `${id.toLowerCase()}@flex.app`
      await signInWithEmail(email, pwd)
      await bootstrap()
      navigate('/app', { replace: true })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Identifiants incorrects.')
      setBusy(false)
    }
  }

  return (
    <div className="grain relative flex min-h-[100dvh] flex-col overflow-hidden px-6 pb-10 pt-6">
      {/* Halos d'ambiance luxueux */}
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-flex-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-32 h-64 w-64 rounded-full bg-flex-pink/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <button onClick={() => navigate('/')} className="relative w-fit rounded-full p-2 text-zinc-400">
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        {/* Logo animé (création) */}
        <BrandLogo size={150} animate />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 font-display text-3xl font-extrabold"
        >
          Content de te revoir
        </motion.h1>
        <p className="mt-2 text-sm text-zinc-500">Connecte-toi pour retrouver ton univers.</p>

        {/* Carte de connexion (verre) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass mt-7 w-full max-w-sm space-y-3 rounded-3xl p-5 shadow-card"
        >
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              value={ident}
              onChange={(e) => setIdent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ton pseudo (ou email)"
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
              className="input-luxe pl-12"
            />
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ton mot de passe"
              className="input-luxe pl-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500"
              aria-label={showPwd ? 'Masquer' : 'Afficher'}
            >
              {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {err && <p className="text-sm text-flex-pink">{err}</p>}

          <button onClick={submit} disabled={!canSubmit} className="btn-gold w-full text-lg disabled:opacity-40">
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Se connecter'}
          </button>

          <button
            onClick={() => navigate('/forgot')}
            className="w-full pt-1 text-center text-sm font-semibold text-zinc-500 transition hover:text-gold"
          >
            Mot de passe oublié ?
          </button>
        </motion.div>

        <p className="relative mt-6 flex items-center gap-1.5 text-[11px] text-zinc-600">
          <ShieldCheck className="h-3.5 w-3.5" /> Connexion chiffrée — ton mot de passe n'est jamais stocké en clair.
        </p>

        <p className="relative mt-4 text-center text-sm text-zinc-500">
          Pas encore de compte ?{' '}
          <button onClick={() => navigate('/claim')} className="font-bold text-gold">
            Crée le tien
          </button>
        </p>
      </div>
    </div>
  )
}
