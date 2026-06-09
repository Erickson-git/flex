import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'
import { fetchRoomMessages, sendRoomMessage, subscribeRoom } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { useEmojiBurst } from './EmojiBurst'
import { Avatar } from './Avatar'
import { cn, haptic } from '@/lib/utils'

const HYPE = ['🔥', '😱', '💸', '👑']

/** Chat live compact intégré sous le duel (les spectateurs s'enflamment). */
export function ArenaChat({ roomId }: { roomId: string }) {
  const me = useAuth((s) => s.me)
  const { blast } = useEmojiBurst()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!me) return
    let active = true
    const load = () => fetchRoomMessages(roomId, me).then((m) => active && setMessages(m))
    load()
    const unsub = subscribeRoom(roomId, load)
    return () => {
      active = false
      unsub()
    }
  }, [roomId, me])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  if (!me) return null

  async function send(text: string) {
    if (!text.trim()) return
    haptic(8)
    setDraft('')
    const msg = await sendRoomMessage(roomId, text, null, me!)
    setMessages((m) => [...m, msg])
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.map((m) => {
          const mine = m.author_id === me.id
          return (
            <div key={m.id} className={cn('flex items-end gap-1.5', mine ? 'justify-end' : 'justify-start')}>
              {!mine && <Avatar name={m.author_name} url={m.author_avatar} size={22} />}
              <span
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-1.5 text-sm',
                  mine ? 'bg-gold-grad text-ink-900' : 'glass text-zinc-100',
                )}
              >
                {!mine && <b className="mr-1 text-xs text-zinc-400">{m.author_name}</b>}
                {m.content}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 px-2 pb-1">
        {HYPE.map((e) => (
          <button key={e} onClick={() => blast(e)} className="text-xl transition active:scale-125">
            {e}
          </button>
        ))}
      </div>

      <div className="safe-bottom flex items-center gap-2 border-t border-white/5 px-3 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(draft)}
          placeholder="Enflamme le chat…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
        />
        <button
          onClick={() => send(draft)}
          disabled={!draft.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 transition active:scale-90 disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
