import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Edit } from 'lucide-react'
import type { DirectThread } from '@/lib/types'
import { fetchThreads } from '@/lib/api'
import { Avatar } from '@/components/Avatar'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { haptic, timeAgo } from '@/lib/utils'

export default function Directs() {
  const navigate = useNavigate()
  const [threads, setThreads] = useState<DirectThread[]>([])

  useEffect(() => {
    fetchThreads().then(setThreads)
  }, [])

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-ink-900/80 px-5 pb-3 pt-2 backdrop-blur-xl">
        <h1 className="font-display text-3xl font-extrabold">
          The <span className="text-gold-grad">Directs</span>
        </h1>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-gold-grad text-ink-900 active:scale-95">
          <Edit className="h-5 w-5" />
        </button>
      </header>

      <div className="px-3 pt-2">
        {threads.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            onClick={() => {
              haptic(8)
              navigate(`/app/directs/${t.id}`, { state: t })
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition active:bg-white/5"
          >
            <div className="relative">
              <Avatar name={t.peer.display_name} url={t.peer.avatar_url} size={54} ring={t.unread > 0} />
              {t.unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-flex-pink px-1 text-[11px] font-bold text-white">
                  {t.unread}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-white">{t.peer.display_name}</span>
                <PrestigeBadge score={t.peer.flex_score} size="sm" />
              </div>
              <div className="truncate text-sm text-zinc-400">{t.last_message}</div>
            </div>
            <span className="shrink-0 text-[11px] text-zinc-600">{timeAgo(t.last_at)}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
