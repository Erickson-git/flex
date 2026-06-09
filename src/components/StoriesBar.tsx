import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Story } from '@/lib/types'
import { DEMO_STORIES } from '@/lib/demoData'
import { useAuth } from '@/store/useAuth'
import { Avatar } from './Avatar'
import { SmartImage } from './SmartImage'
import { haptic } from '@/lib/utils'

/** Barre de stories horizontale + visionneuse plein écran. */
export function StoriesBar() {
  const me = useAuth((s) => s.me)
  const [open, setOpen] = useState<Story | null>(null)

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3">
        {/* Ta story */}
        {me && (
          <button className="flex w-16 shrink-0 flex-col items-center gap-1" onClick={() => haptic(8)}>
            <div className="relative">
              <Avatar name={me.display_name} url={me.avatar_url} size={60} />
              <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink-900 bg-gold-grad text-ink-900">
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </div>
            <span className="truncate text-[11px] text-zinc-400">Ta story</span>
          </button>
        )}

        {DEMO_STORIES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              haptic(8)
              setOpen(s)
            }}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span className="rounded-full bg-gradient-to-tr from-gold via-flex-pink to-flex-violet p-[2px]">
              <span className="block rounded-full border-2 border-ink-900">
                <Avatar name={s.author?.display_name ?? '?'} url={s.author?.avatar_url} size={56} />
              </span>
            </span>
            <span className="truncate text-[11px] text-zinc-400">{s.author?.username}</span>
          </button>
        ))}
      </div>

      {/* Visionneuse */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black"
            onClick={() => setOpen(null)}
          >
            <SmartImage src={open.media_url} seed={open.id.length} className="h-full w-full" />
            <div className="absolute inset-x-0 top-0 safe-top flex items-center gap-3 p-4">
              <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4 }}
                  onAnimationComplete={() => setOpen(null)}
                />
              </div>
              <button className="text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="absolute bottom-0 inset-x-0 flex items-center gap-3 p-5">
              <Avatar name={open.author?.display_name ?? '?'} url={open.author?.avatar_url} size={40} ring />
              <span className="font-semibold text-white">@{open.author?.username}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
