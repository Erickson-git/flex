import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Gift } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { PioneerBadge } from '@/components/PioneerBadge'
import { Avatar } from '@/components/Avatar'
import { haptic, tierLabel } from '@/lib/utils'

/**
 * Message de bienvenue exclusif et personnalisé.
 * C'est le "investment + reward" du premier instant : on confirme à
 * l'utilisateur qu'il vient d'obtenir un statut rare et nommé.
 */
export default function Welcome() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const location = useLocation()
  const refresh = useEconomy((s) => s.refresh)
  const referrer = (location.state as { referrer?: string | null } | null)?.referrer ?? null

  useEffect(() => {
    haptic([10, 40, 10, 40, 10])
    if (me) refresh(me.id) // intègre le bonus de parrainage éventuel
  }, [me, refresh])

  if (!me) return <Navigate to="/" replace />

  const isPioneer = me.tier === 'pioneer'
  const headline = isPioneer
    ? `Tu es le Pionnier #${me.joined_rank}.`
    : `Bienvenue, Fondateur #${me.joined_rank}.`

  return (
    <div className="grain relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* rayons dorés */}
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_40%,rgba(232,201,122,0.12),transparent_25%,rgba(255,77,141,0.1),transparent_60%,rgba(232,201,122,0.12))]" />

      {/* confettis dorés */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute top-1/3 h-2 w-2 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: i % 2 ? '#e8c97a' : '#ff4d8d',
          }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: 360, opacity: [0, 1, 0], rotate: 360 }}
          transition={{ duration: 2.4, delay: (i % 8) * 0.12, ease: 'easeIn' }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="relative"
      >
        <Avatar name={me.display_name} size={104} ring />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-5"
      >
        <PioneerBadge tier={me.tier} rank={me.joined_rank} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-5 font-display text-4xl font-extrabold leading-tight"
      >
        {headline}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 max-w-sm text-zinc-300"
      >
        @{me.username}, tu fais partie des premiers à écrire l’histoire de FLEX.
        Ton statut de <span className="font-semibold text-gold">{tierLabel(me.tier)}</span> est
        gravé à vie — personne ne pourra te le retirer.
      </motion.p>

      {referrer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-6 flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold shadow-glow"
        >
          <Gift className="h-4 w-4" />
          +50 Sparks ✦ grâce à @{referrer}
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        onClick={() => {
          haptic(15)
          navigate('/app', { replace: true })
        }}
        className="btn-gold mt-10 flex items-center gap-2 text-lg"
      >
        Découvrir le Flow
        <ArrowRight className="h-5 w-5" />
      </motion.button>
    </div>
  )
}
