import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Loader2, LogIn, ScanFace, UserPlus } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/store/useAuth'
import { takeRedirect } from '@/lib/redirect'
import { biometricEnabled, biometricSupported, getFaceAccount, verifyBiometric } from '@/lib/biometric'
import { haptic } from '@/lib/utils'

/**
 * Écran d'accueil = PAGE DE CONNEXION : avant d'entrer dans FLEX, on choisit
 * Créer un compte / Continuer en invité / Compte existant. Scan facial proposé
 * en plus si un visage est déjà enregistré sur cet appareil (retour express).
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const enterAsGuest = useAuth((s) => s.enterAsGuest)
  const bootstrap = useAuth((s) => s.bootstrap)
  const [busy, setBusy] = useState(false)
  const [faceOk, setFaceOk] = useState(false)
  const [faceBusy, setFaceBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Le scan facial n'est proposé que si un visage est enregistré sur l'appareil.
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
        setErr('Visage non reconnu — utilise un autre mode.')
        return
      }
      haptic([10, 30, 10])
      await bootstrap()
      if (useAuth.getState().me) navigate(takeRedirect() ?? '/app', { replace: true })
      else setErr('Session expirée — connecte-toi avec ton mot de passe.')
    } catch {
      setErr('Échec du scan facial.')
    } finally {
      setFaceBusy(false)
    }
  }

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-6 py-14">
      {/* halos d'ambiance */}
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-flex-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-40 h-64 w-64 rounded-full bg-flex-pink/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        {/* Logo animé : l'accueil est l'écran de lancement de l'app. */}
        <BrandLogo size={200} baseline={false} animate />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative w-full max-w-sm space-y-3"
      >
        {/* Scan facial — retour express (uniquement si un visage est enregistré) */}
        {faceOk && (
          <button
            onClick={faceLogin}
            disabled={faceBusy || busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/[0.08] py-3.5 text-sm font-bold text-gold active:scale-[0.98] disabled:opacity-60"
          >
            {faceBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ScanFace className="h-5 w-5" /> Entrer avec mon visage</>}
          </button>
        )}

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

        {err && <p className="text-center text-sm text-flex-pink">{err}</p>}

        <p className="text-center text-xs text-zinc-600">
          L'invité peut seulement regarder. Le compte invité disparaît à la
          déconnexion — crée un compte pour interagir et le garder.
        </p>
      </motion.div>
    </div>
  )
}
