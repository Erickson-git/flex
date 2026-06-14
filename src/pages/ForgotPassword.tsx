import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { requestPasswordReset } from '@/lib/account'
import { BrandLogo } from '@/components/BrandLogo'
import { haptic } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Mot de passe oublié : on envoie un lien de réinitialisation à l'email.
 * Anti-énumération : on affiche TOUJOURS le même message de confirmation,
 * qu'un compte existe ou non → un attaquant n'apprend rien.
 */
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!EMAIL_RE.test(email.trim()) || busy) return
    setBusy(true)
    haptic([10, 30, 10])
    try {
      await requestPasswordReset(email.trim())
    } catch {
      /* on n'expose PAS l'erreur (anti-énumération) */
    } finally {
      setBusy(false)
      setSent(true) // message générique dans tous les cas
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col px-6 pt-6">
      <button onClick={() => navigate('/signin')} className="w-fit rounded-full p-2 text-zinc-400">
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-center">
        <BrandLogo size={110} baseline={false} />

        {sent ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10">
              <MailCheck className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-extrabold">Vérifie tes mails</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Si un compte est associé à <span className="text-white">{email.trim()}</span>, un lien de
              réinitialisation vient d'être envoyé. Ouvre-le pour choisir un nouveau mot de passe.
            </p>
            <p className="mt-3 text-xs text-zinc-600">Le lien est à usage unique et expire rapidement.</p>
            <button
              onClick={() => navigate('/signin')}
              className="btn-gold mt-7 w-full text-lg"
            >
              Revenir à la connexion
            </button>
            <button onClick={() => setSent(false)} className="mt-3 text-sm font-semibold text-zinc-500">
              Renvoyer / changer d'email
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 w-full">
            <h1 className="text-center font-display text-2xl font-extrabold">Mot de passe oublié</h1>
            <p className="mt-2 text-center text-sm text-zinc-400">
              Entre l'email de ton compte. On t'envoie un lien sécurisé pour le réinitialiser.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ton email"
              autoCapitalize="none"
              autoFocus
              className="input-luxe mt-6"
            />
            <button onClick={submit} disabled={busy || !EMAIL_RE.test(email.trim())} className="btn-gold mt-4 w-full text-lg disabled:opacity-40">
              {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Envoyer le lien'}
            </button>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Seul le propriétaire de l'email peut réinitialiser le mot de passe.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
