import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Eye, EyeOff, Loader2, ScanFace } from 'lucide-react'
import { signInWithEmail } from '@/lib/account'
import { takeRedirect } from '@/lib/redirect'
import { lockRemaining, recordLoginFailure, recordLoginSuccess } from '@/lib/loginGuard'
import { biometricEnabled, biometricSupported, getFaceAccount, verifyBiometric } from '@/lib/biometric'
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
  const [faceOk, setFaceOk] = useState(false)
  const [faceBusy, setFaceBusy] = useState(false)

  const canSubmit = ident.trim().length > 0 && pwd.length > 0 && !busy

  // La « connexion au visage » est-elle dispo sur cet appareil ?
  useEffect(() => {
    const uid = getFaceAccount()
    if (uid && biometricEnabled(uid)) biometricSupported().then((s) => setFaceOk(s))
  }, [])

  async function faceLogin() {
    const uid = getFaceAccount()
    if (!uid || faceBusy) return
    setFaceBusy(true)
    setErr(null)
    try {
      const ok = await verifyBiometric(uid)
      if (!ok) {
        setErr('Visage non reconnu — utilise ton mot de passe.')
        return
      }
      haptic([10, 30, 10])
      // Le visage est reconnu : on restaure la session de cet appareil.
      await bootstrap()
      if (useAuth.getState().me) {
        navigate(takeRedirect() ?? '/app', { replace: true })
      } else {
        setErr('Session expirée — connecte-toi une fois avec ton mot de passe.')
      }
    } catch {
      setErr('Échec du scan — utilise ton mot de passe.')
    } finally {
      setFaceBusy(false)
    }
  }

  async function submit() {
    if (!canSubmit) return
    // Anti-bruteforce : si verrouillé après trop d'échecs, on bloque la tentative.
    const wait = lockRemaining()
    if (wait > 0) {
      setErr(`Trop de tentatives. Réessaie dans ${wait}s.`)
      return
    }
    setBusy(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      const id = ident.trim()
      const email = id.includes('@') ? id : `${id.toLowerCase()}@flex.app`
      await signInWithEmail(email, pwd)
      recordLoginSuccess()
      await bootstrap()
      navigate(takeRedirect() ?? '/app', { replace: true })
    } catch {
      // Message GÉNÉRIQUE (anti-énumération : ne révèle pas si le pseudo existe).
      recordLoginFailure()
      const left = lockRemaining()
      setErr(left > 0 ? `Trop de tentatives. Réessaie dans ${left}s.` : 'Identifiants incorrects.')
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
          {faceOk && (
            <>
              <button
                onClick={faceLogin}
                disabled={faceBusy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3.5 text-base font-bold text-gold transition active:scale-[0.98] disabled:opacity-50"
              >
                {faceBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanFace className="h-5 w-5" />}
                Se connecter avec le visage
              </button>
              <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-widest text-zinc-600">
                <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}
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
