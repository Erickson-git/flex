import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { claimUsername, isUsernameAvailable } from '@/lib/api'
import { redeemPendingReferral } from '@/lib/referral'
import { useAuth } from '@/store/useAuth'
import { haptic, validateUsername } from '@/lib/utils'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

/**
 * Revendication du pseudo. Urgence + rareté :
 *  - vérification de disponibilité en direct (peur de "se le faire prendre")
 *  - compteur de places de Pionniers restantes
 *  - feedback instantané vert/rouge → micro-récompense de validation
 */
export default function ClaimUsername() {
  const navigate = useNavigate()
  const setMe = useAuth((s) => s.setMe)
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [spotsLeft] = useState(() => 100 - (6 + Math.floor((Date.now() / 1000) % 7)))

  // Vérification débouncée de disponibilité
  useEffect(() => {
    const u = value.trim().toLowerCase()
    if (!u) return setStatus('idle')
    const invalid = validateUsername(u)
    if (invalid) {
      setError(invalid)
      return setStatus('invalid')
    }
    setError(null)
    setStatus('checking')
    const t = setTimeout(async () => {
      const ok = await isUsernameAvailable(u)
      setStatus(ok ? 'available' : 'taken')
      if (ok) haptic(10)
    }, 450)
    return () => clearTimeout(t)
  }, [value])

  async function submit() {
    if (status !== 'available' || submitting) return
    setSubmitting(true)
    haptic([10, 30, 10])
    try {
      const me = await claimUsername(value)
      setMe(me)
      const referrer = await redeemPendingReferral(me) // bonus parrain/filleul
      navigate('/welcome', { replace: true, state: { referrer } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur. Réessaie.')
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col px-6 pt-16">
      <div className="pointer-events-none absolute -right-10 top-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-flex-pink/40 bg-flex-pink/10 px-4 py-1.5 text-sm font-semibold text-flex-pink"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-flex-pink" />
        Plus que {spotsLeft} places de Pionnier
      </motion.div>

      <h1 className="font-display text-4xl font-extrabold leading-tight">
        Choisis ton <span className="text-gold-grad">pseudo</span>.
      </h1>
      <p className="mt-3 text-zinc-400">
        Il est unique. Une fois pris, il l’est pour toujours. Prends-le avant un autre.
      </p>

      <div className="mt-8">
        <div className="relative">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-zinc-500">
            @
          </span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, '').toLowerCase())}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="ton_pseudo"
            maxLength={20}
            className="input-luxe pl-10 pr-12"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
            {status === 'available' && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400">
                <Check className="h-6 w-6" strokeWidth={3} />
              </motion.span>
            )}
            {(status === 'taken' || status === 'invalid') && (
              <AlertCircle className="h-5 w-5 text-flex-pink" />
            )}
          </span>
        </div>

        <div className="mt-3 min-h-[1.25rem] text-sm">
          {status === 'available' && (
            <span className="font-semibold text-emerald-400">Libre ! Il est à toi. ✦</span>
          )}
          {status === 'taken' && <span className="text-flex-pink">Déjà pris. Trouve mieux 😏</span>}
          {(status === 'invalid' || error) && <span className="text-flex-pink">{error}</span>}
        </div>
      </div>

      <div className="mt-auto pb-10">
        <button
          onClick={submit}
          disabled={status !== 'available' || submitting}
          className="btn-gold flex w-full items-center justify-center gap-2 text-lg disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrer dans FLEX'}
        </button>
      </div>
    </div>
  )
}
