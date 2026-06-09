import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import type { SecretMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Bulle de message éphémère. Affiche un compte à rebours et se replie
 * d'elle-même à expiration (autodestruction). La rareté temporelle pousse
 * à revenir vite : le contenu ne sera bientôt plus là.
 */
export function EphemeralMessage({
  msg,
  mine,
  onExpire,
}: {
  msg: SecretMessage
  mine: boolean
  onExpire: (id: string) => void
}) {
  const [left, setLeft] = useState(() => Math.max(0, msg.expires_at - Date.now()))

  useEffect(() => {
    const t = setInterval(() => {
      const remaining = Math.max(0, msg.expires_at - Date.now())
      setLeft(remaining)
      if (remaining <= 0) onExpire(msg.id)
    }, 500)
    return () => clearInterval(t)
  }, [msg.expires_at, msg.id, onExpire])

  const secs = Math.ceil(left / 1000)
  const total = Math.max(1, Math.round((msg.expires_at - new Date(msg.created_at).getTime()) / 1000))
  const pct = Math.max(0, Math.min(100, (secs / total) * 100))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, filter: 'blur(8px)' }}
      transition={{ duration: 0.35 }}
      className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[78%] overflow-hidden rounded-2xl px-4 py-2.5',
          mine ? 'bg-gold-grad text-ink-900' : 'glass text-zinc-100',
        )}
      >
        {!mine && <div className="mb-0.5 text-xs font-semibold opacity-70">{msg.author_name}</div>}
        <p className="text-[15px] leading-snug">{msg.content}</p>
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1 text-[10px] font-medium',
            mine ? 'text-ink-900/60' : 'text-zinc-500',
          )}
        >
          <Flame className="h-3 w-3" />
          {secs}s
          <span
            className={cn(
              'ml-1 h-0.5 flex-1 overflow-hidden rounded-full',
              mine ? 'bg-ink-900/20' : 'bg-white/10',
            )}
          >
            <span
              className={cn('block h-full transition-all duration-500', mine ? 'bg-ink-900/70' : 'bg-gold')}
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>
    </motion.div>
  )
}
