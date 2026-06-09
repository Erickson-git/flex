import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Clock, Heart, RefreshCw } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { extendSparkRoom, sparkRoomTimeLeft } from '@/lib/social'
import { ArenaChat } from '@/components/ArenaChat'
import { Avatar } from '@/components/Avatar'
import { haptic } from '@/lib/utils'

/**
 * Salon de drague éphémère (24 h). Compte à rebours visible ; possibilité de
 * prolonger. À expiration, l'historique disparaît définitivement.
 */
export default function SparkRoom() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const peer = (location.state as { peer?: Profile } | null)?.peer ?? null
  const [left, setLeft] = useState(() => sparkRoomTimeLeft(id))

  useEffect(() => {
    const t = setInterval(() => setLeft(sparkRoomTimeLeft(id)), 1000)
    return () => clearInterval(t)
  }, [id])

  const expired = left <= 0
  const h = Math.floor(left / 3600_000)
  const m = Math.floor((left % 3600_000) / 60_000)

  return (
    <div className="flex h-[100dvh] flex-col bg-noir-grad">
      <header className="safe-top flex items-center gap-3 border-b border-flex-pink/20 bg-flex-pink/5 px-4 pb-2 pt-2">
        <button onClick={() => navigate('/app/directs')} className="rounded-full p-1 text-zinc-300">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <Avatar name={peer?.display_name ?? 'Match'} url={peer?.avatar_url} size={40} ring ringClass="ring-2 ring-flex-pink ring-offset-2 ring-offset-ink-900" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Heart className="h-4 w-4 fill-flex-pink text-flex-pink" /> {peer?.display_name ?? 'Match'}
          </div>
          <div className="flex items-center gap-1 text-xs text-flex-pink">
            <Clock className="h-3 w-3" />
            {expired ? 'Salon expiré' : `Disparaît dans ${h}h ${m}m`}
          </div>
        </div>
        <button
          onClick={() => {
            haptic(12)
            extendSparkRoom(id)
            setLeft(sparkRoomTimeLeft(id))
          }}
          className="flex items-center gap-1 rounded-full bg-flex-pink/20 px-3 py-1.5 text-xs font-bold text-flex-pink active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" /> +24h
        </button>
      </header>

      {expired ? (
        <div className="grid flex-1 place-items-center px-8 text-center text-sm text-zinc-500">
          Ce salon de drague s’est effacé. Sparkez-vous à nouveau pour le rouvrir. 💔
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <ArenaChat roomId={id} />
        </div>
      )}
    </div>
  )
}
