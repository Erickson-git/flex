import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ImagePlus, Send, X } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'
import { fetchRoomMessages, sendRoomMessage, subscribeRoom } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { MEDIA } from '@/lib/media'
import { cn, haptic, looksMalicious, sanitizeText, timeAgo } from '@/lib/utils'
import { Avatar } from './Avatar'
import { SmartImage } from './SmartImage'
import { useEmojiBurst } from './EmojiBurst'

const QUICK_EMOJIS = ['🔥', '😍', '💀', '👑', '💯', '🤯']
const PHOTO_CHOICES = [MEDIA.nightlife[1], MEDIA.fashion[2], MEDIA.luxury[1], MEDIA.neon[3]]

/** Salle de chat temps réel partagée par les Squads et les Directs. */
export function ChatRoom({
  roomId,
  title,
  subtitle,
  accent = 'from-flex-violet to-flex-pink',
  headerExtra,
}: {
  roomId: string
  title: string
  subtitle?: string
  accent?: string
  headerExtra?: ReactNode
}) {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const { blast } = useEmojiBurst()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
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

  async function send() {
    const raw = draft.trim()
    if ((!raw && !pendingPhoto) || looksMalicious(raw)) return
    const text = sanitizeText(raw, 1000)
    haptic(10)
    setDraft('')
    const photo = pendingPhoto
    setPendingPhoto(null)
    const msg = await sendRoomMessage(roomId, text, photo, me!)
    setMessages((m) => [...m, msg])
  }

  function react(emoji: string) {
    blast(emoji)
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col">
      {/* En-tête */}
      <header className={cn('safe-top bg-gradient-to-r px-4 pb-3 pt-2', accent)}>
        <div className="flex items-center gap-3 rounded-b-sm">
          <button onClick={() => navigate(-1)} className="rounded-full p-1 text-ink-900">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="font-display text-lg font-bold text-ink-900">{title}</div>
            {subtitle && <div className="text-xs font-medium text-ink-900/70">{subtitle}</div>}
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-ink-900/20 px-2.5 py-1 text-[11px] font-bold text-ink-900">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-900" />
            LIVE
          </span>
        </div>
        {headerExtra}
      </header>

      {/* Fil */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const mine = m.author_id === me.id
          return (
            <div key={m.id} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
              {!mine && <Avatar name={m.author_name} url={m.author_avatar} size={30} />}
              <div className={cn('max-w-[76%]', mine && 'items-end')}>
                {!mine && <div className="mb-0.5 ml-1 text-[11px] font-semibold text-zinc-500">{m.author_name}</div>}
                <div
                  className={cn(
                    'overflow-hidden rounded-2xl text-[15px]',
                    mine ? 'bg-gold-grad text-ink-900' : 'glass text-zinc-100',
                  )}
                >
                  {m.media_url && (
                    <SmartImage src={m.media_url} seed={m.id.length} className="aspect-video w-60" overlay={false} />
                  )}
                  {m.content && <p className="px-3.5 py-2 leading-snug">{m.content}</p>}
                </div>
                <div className={cn('mt-0.5 text-[10px] text-zinc-600', mine ? 'text-right' : 'ml-1')}>
                  {timeAgo(m.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Réactions explosives */}
      <div className="flex justify-around px-4 py-1.5">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => react(e)}
            className="text-2xl transition active:scale-125"
            aria-label={`Réagir ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Photo en attente */}
      <AnimatePresence>
        {pendingPhoto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="relative inline-block">
              <SmartImage src={pendingPhoto} className="h-20 w-20 rounded-xl" overlay={false} />
              <button
                onClick={() => setPendingPhoto(null)}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink-800 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sélecteur de photo (banque) */}
      <AnimatePresence>
        {picker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-2 grid grid-cols-4 gap-2 rounded-2xl glass p-2"
          >
            {PHOTO_CHOICES.map((p) => (
              <button
                key={p}
                onClick={() => {
                  haptic(8)
                  setPendingPhoto(p)
                  setPicker(false)
                }}
              >
                <SmartImage src={p} seed={p.length} className="aspect-square rounded-lg" overlay={false} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saisie */}
      <div className="safe-bottom flex items-center gap-2 border-t border-white/5 px-3 pt-2">
        <button
          onClick={() => {
            haptic(8)
            setPicker((v) => !v)
          }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-400"
        >
          <ImagePlus className="h-6 w-6" />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
        />
        <button
          onClick={send}
          disabled={!draft.trim() && !pendingPhoto}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 transition active:scale-90 disabled:opacity-30"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
