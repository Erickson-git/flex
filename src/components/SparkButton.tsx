import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { sparkProfile } from '@/lib/social'
import { useAuth } from '@/store/useAuth'
import { useEmojiBurst } from './EmojiBurst'
import { cn, haptic } from '@/lib/utils'

/**
 * Bouton "Spark" (drague). En cas de match mutuel : explosion de cœurs
 * et ouverture d'un salon de drague éphémère (24 h).
 */
export function SparkButton({ target, className }: { target: Profile; className?: string }) {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const { blast } = useEmojiBurst()
  const [sparked, setSparked] = useState(false)

  async function spark() {
    if (!me || sparked) return
    setSparked(true)
    haptic([10, 40, 10, 40])
    const res = await sparkProfile(me, target)
    if (res.matched && res.room_id) {
      blast('💘')
      setTimeout(() => navigate(`/app/spark/${res.room_id}`, { state: { peer: target } }), 900)
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={spark}
      className={cn(
        'flex items-center justify-center gap-2 rounded-2xl py-3 font-bold transition',
        sparked ? 'bg-flex-pink text-white' : 'border border-flex-pink/50 bg-flex-pink/10 text-flex-pink',
        className,
      )}
    >
      <Heart className={cn('h-5 w-5', sparked && 'fill-white')} />
      {sparked ? 'Sparké ✦' : 'Spark'}
    </motion.button>
  )
}
