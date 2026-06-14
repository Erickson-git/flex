import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { hasActiveSession, updatePassword } from '@/lib/account'
import { useAuth } from '@/store/useAuth'
import { BrandLogo } from '@/components/BrandLogo'
import { haptic } from '@/lib/utils'

const MIN_PWD = 6

/**
 * Page atteinte depuis le lien email de réinitialisation. Le client Supabase a
 * déjà ouvert une session de récupération (depuis l'URL). On exige un NOUVEAU
 * mot de passe ; après changement, les autres sessions sont invalidées.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const bootstrap = useAuth((s) => s.bootstrap)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean | null>(null) // session de récup valide ?
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Laisse au client Supabase le temps de traiter le lien (détecte la session).
    const t = setTimeout(() => {
      hasActiveSession().then(setReady).catch(() => setReady(false))
    }, 600)
    return () => clearTimeout(t)
  }, [])

  const pwdOk = pwd.length >= MIN_PWD
  const match = pwd === pwd2
  const canSubmit = pwdOk && match && !busy

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      await updatePassword(pwd)
      await bootstrap()
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec. Le lien a peut-être expiré.')
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col px-6 pt-10">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center">
        <BrandLogo size={110} baseline={false} />

        {done ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-extrabold">Mot de passe changé ✦</h1>
            <p className="mt-2 text-sm text-zinc-400">Ton compte est sécurisé avec ton nouveau mot de passe.</p>
            <button onClick={() => navigate('/app', { replace: true })} className="btn-gold mt-7 w-full text-lg">
              Entrer dans FLEX
            </button>
          </motion.div>
        ) : ready === false ? (
          <div className="mt-10 text-center">
            <h1 className="font-display text-2xl font-extrabold">Lien invalide ou expiré</h1>
            <p className="mt-2 text-sm text-zinc-400">Le lien de réinitialisation n'est plus valable. Redemande-en un.</p>
            <button onClick={() => navigate('/forgot', { replace: true })} className="btn-gold mt-6 w-full text-lg">
              Demander un nouveau lien
            </button>
          </div>
        ) : ready === null ? (
          <div className="mt-16"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 w-full">
            <h1 className="text-center font-display text-2xl font-extrabold">Nouveau mot de passe</h1>
            <p className="mt-2 text-center text-sm text-zinc-400">Choisis un mot de passe que toi seul connais.</p>

            <div className="relative mt-6">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="input-luxe pl-12 pr-12"
              />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500" aria-label={showPwd ? 'Masquer' : 'Afficher'}>
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Confirme le mot de passe"
              className="input-luxe mt-3"
            />
            <div className="mt-2 min-h-[1.1rem] text-sm">
              {pwd.length > 0 && !pwdOk && <span className="text-flex-pink">Au moins {MIN_PWD} caractères.</span>}
              {pwdOk && pwd2.length > 0 && !match && <span className="text-flex-pink">Les mots de passe diffèrent.</span>}
              {err && <span className="text-flex-pink">{err}</span>}
            </div>

            <button onClick={submit} disabled={!canSubmit} className="btn-gold mt-3 w-full text-lg disabled:opacity-40">
              {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Changer le mot de passe'}
            </button>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Les autres appareils connectés seront déconnectés.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
