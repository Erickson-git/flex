import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { signInWithEmail } from '@/lib/account'
import { useAuth } from '@/store/useAuth'
import { BrandLogo } from '@/components/BrandLogo'
import { haptic } from '@/lib/utils'

/** Connexion — épurée et luxueuse : pseudo (ou email) + mot de passe. */
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
    <div className="relative flex min-h-[100dvh] flex-col px-7 pt-6">
      {/* Un seul halo doré, discret — ambiance luxe minimale */}
      <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <button onClick={() => navigate('/')} className="relative w-fit rounded-full p-2 text-zinc-400">
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div className="relative flex flex-1 flex-col items-center justify-center pb-10">
        <BrandLogo size={132} baseline={false} animate />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10 w-full max-w-xs space-y-3"
        >
          <input
            value={ident}
            onChange={(e) => setIdent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Pseudo ou email"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            className="input-luxe text-center"
          />

          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Mot de passe"
              className="input-luxe pr-12 text-center"
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

          {err && <p className="text-center text-sm text-flex-pink">{err}</p>}

          <button onClick={submit} disabled={!canSubmit} className="btn-gold w-full text-lg disabled:opacity-40">
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Se connecter'}
          </button>

          <button
            onClick={() => navigate('/forgot')}
            className="w-full pt-1 text-center text-sm text-zinc-500 transition hover:text-gold"
          >
            Mot de passe oublié ?
          </button>
        </motion.div>
      </div>

      <button
        onClick={() => navigate('/claim')}
        className="relative pb-8 text-center text-sm text-zinc-500"
      >
        Pas encore de compte ? <span className="font-bold text-gold">Crée le tien</span>
      </button>
    </div>
  )
}
