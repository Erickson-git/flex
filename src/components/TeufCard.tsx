import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, MapPin, Sparkle, Ticket } from 'lucide-react'
import type { Squad } from '@/lib/types'
import { SmartImage } from './SmartImage'
import { compact, haptic } from '@/lib/utils'

export function TeufCard({ teuf }: { teuf: Squad }) {
  const navigate = useNavigate()
  const date = teuf.date ? new Date(teuf.date) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/5"
    >
      <SmartImage src={teuf.cover_url} seed={teuf.name.length} className="absolute inset-0" />
      <div className="relative flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-2xl font-extrabold text-white drop-shadow">
              {teuf.emoji} {teuf.name}
            </div>
            <div className="text-sm text-white/80">{teuf.topic}</div>
          </div>
          <span className="shrink-0 rounded-full bg-ink-900/60 px-3 py-1 text-xs font-bold text-gold backdrop-blur">
            {teuf.price ? (
              <span className="flex items-center gap-1"><Sparkle className="h-3 w-3" />{compact(teuf.price)}</span>
            ) : (
              'GRATUIT'
            )}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-white/80">
          {date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {date.toLocaleDateString('fr', { day: 'numeric', month: 'short' })} ·{' '}
              {date.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {teuf.location && (
            <a
              href={teuf.map_url || '#'}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              {teuf.location}
            </a>
          )}
        </div>

        <button
          onClick={() => {
            haptic([10, 30, 10])
            navigate(`/app/squads/${teuf.id}`, { state: teuf })
          }}
          className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gold-grad py-2.5 text-sm font-bold text-ink-900 active:scale-95"
        >
          <Ticket className="h-4 w-4" /> Rejoindre la Teuf
        </button>
      </div>
    </motion.div>
  )
}
