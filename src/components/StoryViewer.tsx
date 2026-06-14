import { useEffect, useRef, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { Story } from '@/lib/stories'
import { deleteStory } from '@/lib/stories'
import { useAuth } from '@/store/useAuth'
import { Avatar } from './Avatar'
import { cn, timeAgo } from '@/lib/utils'

const GRADS: Record<string, string> = {
  violet: 'from-flex-violet via-ink-700 to-flex-pink',
  cyan: 'from-flex-cyan via-ink-700 to-flex-violet',
  pink: 'from-flex-pink via-ink-700 to-gold',
}

export function StoryViewer({ stories, onClose, onDeleted }: { stories: Story[]; onClose: () => void; onDeleted?: () => void }) {
  const me = useAuth((s) => s.me)
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const timer = useRef<number | null>(null)
  const cur = stories[idx]
  const isVideo = cur?.kind === 'video'

  function next() {
    setIdx((i) => {
      if (i < stories.length - 1) return i + 1
      onClose()
      return i
    })
  }
  function prev() {
    setIdx((i) => Math.max(0, i - 1))
  }

  useEffect(() => {
    setProgress(0)
    if (timer.current) clearInterval(timer.current)
    if (!cur || isVideo) return
    const dur = 5000
    const step = 50
    let elapsed = 0
    timer.current = window.setInterval(() => {
      elapsed += step
      setProgress(elapsed / dur)
      if (elapsed >= dur) next()
    }, step)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, cur?.id, isVideo])

  if (!cur) return null
  const mine = cur.author_id === me?.id

  async function del() {
    if (!window.confirm('Supprimer ce statut ?')) return
    await deleteStory(cur.id)
    onDeleted?.()
    next()
  }

  return (
    <div className="fixed inset-0 z-[88] flex flex-col bg-ink-900">
      <div className="safe-top flex gap-1 px-3 pt-2">
        {stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white" style={{ width: i < idx ? '100%' : i === idx ? `${progress * 100}%` : '0%' }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <Avatar name={cur.author?.display_name ?? '?'} url={cur.author?.avatar_url ?? null} size={36} />
        <div className="flex-1">
          <div className="text-sm font-bold text-white">{cur.author?.display_name}</div>
          <div className="text-[11px] text-zinc-400">{timeAgo(cur.created_at)}</div>
        </div>
        {mine && (
          <button onClick={del} className="p-2 text-white">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button onClick={onClose} className="p-2 text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex-1">
        {cur.kind === 'text' ? (
          <div className={cn('grid h-full w-full place-items-center bg-gradient-to-br p-8 text-center', GRADS[cur.bg ?? 'violet'] ?? GRADS.violet)}>
            <span className="font-display text-2xl font-extrabold text-white drop-shadow">{cur.content}</span>
          </div>
        ) : isVideo ? (
          <video src={cur.media_url ?? undefined} autoPlay playsInline className="h-full w-full bg-black object-contain" onEnded={next} />
        ) : (
          <img src={cur.media_url ?? undefined} alt="" className="h-full w-full bg-black object-contain" />
        )}
        {cur.content && cur.kind !== 'text' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 px-6 text-center">
            <span className="rounded-2xl bg-ink-900/60 px-3 py-1.5 text-sm text-white backdrop-blur">{cur.content}</span>
          </div>
        )}
        <button onClick={prev} className="absolute inset-y-0 left-0 w-1/3" aria-label="Précédent" />
        <button onClick={next} className="absolute inset-y-0 right-0 w-2/3" aria-label="Suivant" />
      </div>
    </div>
  )
}
