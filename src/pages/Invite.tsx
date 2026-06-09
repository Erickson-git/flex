import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { captureReferral } from '@/lib/referral'
import { useAuth } from '@/store/useAuth'

/**
 * Atterrissage d'un lien d'invitation (flesh.app/invite/<pseudo>).
 * On mémorise le parrain puis on dirige vers la revendication de pseudo
 * (ou directement dans l'app si déjà connecté).
 */
export default function Invite() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { me, loading } = useAuth()

  useEffect(() => {
    if (code) captureReferral(code)
    if (loading) return
    const t = setTimeout(() => navigate(me ? '/app' : '/claim', { replace: true }), 1600)
    return () => clearTimeout(t)
  }, [code, me, loading, navigate])

  return (
    <div className="grid min-h-[100dvh] place-items-center px-8 text-center">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gold-grad text-ink-900 shadow-glow">
          <Gift className="h-10 w-10" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold">
          <span className="text-gold-grad">@{code}</span> t’invite sur FLEX
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Inscris-toi maintenant : vous recevez <b className="text-gold">+50 Sparks</b> chacun. ✦
        </p>
      </motion.div>
    </div>
  )
}
