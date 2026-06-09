import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Crown, Eye, Sparkles, TrendingUp, X } from 'lucide-react'
import type { Notification } from '@/lib/types'
import { fetchNotifications, markAllRead } from '@/lib/notifications'
import { timeAgo, cn, haptic } from '@/lib/utils'

const ICON = { trend: TrendingUp, hype: Crown, social: Eye, system: Sparkles }

/** Cloche + panneau de notifications valorisantes. */
export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Notification[]>([])

  useEffect(() => {
    fetchNotifications().then(setList)
  }, [])

  const unread = list.filter((n) => !n.read).length

  async function openPanel() {
    haptic(8)
    setOpen(true)
    await markAllRead()
    setList((l) => l.map((n) => ({ ...n, read: true })))
  }

  return (
    <>
      <button onClick={openPanel} className="relative grid h-9 w-9 place-items-center rounded-full text-zinc-300">
        <Bell className="h-[22px] w-[22px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-flex-pink px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="safe-top absolute right-0 top-0 h-full w-[88%] max-w-sm border-l border-white/10 bg-ink-800/95 p-5 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold">Notifications</h2>
                <button onClick={() => setOpen(false)} className="text-zinc-500">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-2.5">
                {list.map((n) => {
                  const Icon = ICON[n.kind] ?? Sparkles
                  return (
                    <div key={n.id} className={cn('flex gap-3 rounded-2xl border border-white/5 p-3', !n.read ? 'bg-gold/[0.06]' : 'bg-white/[0.02]')}>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white">{n.title}</div>
                        {n.body && <div className="text-xs text-zinc-400">{n.body}</div>}
                        <div className="mt-0.5 text-[10px] text-zinc-600">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
                {list.length === 0 && <div className="py-10 text-center text-sm text-zinc-600">Rien pour l’instant.</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
