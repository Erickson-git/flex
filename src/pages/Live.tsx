import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Eye, Radio, Send } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'
import { Avatar } from '@/components/Avatar'
import { haptic } from '@/lib/utils'

// Salon Live interactif — 100 % Supabase Realtime (présence + broadcast).
// Aucun coût, aucune table : la vidéo (Agora) se branchera dessus plus tard.
const ROOM = 'flex-live-global'
const GIFTS = ['✨', '🔥', '👑', '💎', '🌹']

interface ChatMsg { id: string; username: string; text: string }
interface FloatGift { id: string; emoji: string }

export default function Live() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [viewers, setViewers] = useState(0)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [gifts, setGifts] = useState<FloatGift[]>([])
  const [text, setText] = useState('')
  const [ready, setReady] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase || !me) return
    const channel = supabase.channel(ROOM, {
      config: { presence: { key: me.id }, broadcast: { self: true } },
    })
    channelRef.current = channel
    channel
      .on('presence', { event: 'sync' }, () => {
        setViewers(Object.keys(channel.presenceState()).length)
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((m) => [...m.slice(-49), payload as ChatMsg])
      })
      .on('broadcast', { event: 'gift' }, ({ payload }) => {
        const id = `${Date.now()}-${Math.random()}`
        setGifts((arr) => [...arr, { id, emoji: (payload as { emoji: string }).emoji }])
        setTimeout(() => setGifts((arr) => arr.filter((g) => g.id !== id)), 2200)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username: me.username })
          setReady(true)
        }
      })
    return () => {
      supabase?.removeChannel(channel)
    }
  }, [me])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  function sendChat() {
    const t = text.trim()
    if (!t || !channelRef.current || !me) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: { id: `${Date.now()}`, username: me.username, text: t.slice(0, 140) },
    })
    setText('')
  }

  function sendGift(emoji: string) {
    if (!channelRef.current) return
    haptic([10, 20, 10])
    channelRef.current.send({ type: 'broadcast', event: 'gift', payload: { emoji } })
  }

  if (!supabase) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-8 text-center text-zinc-500">
        Le Live nécessite la connexion backend.
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
      <header className="safe-top flex items-center justify-between px-4 pb-2 pt-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="flex items-center gap-1.5 rounded-full bg-flex-pink/15 px-3 py-1 text-xs font-bold uppercase text-flex-pink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flex-pink" /> En direct
        </span>
        <span className="flex items-center gap-1 text-sm text-zinc-300">
          <Eye className="h-4 w-4" /> {viewers}
        </span>
      </header>

      {/* Scène (vidéo à venir) + cadeaux flottants */}
      <div className="relative mx-4 aspect-video overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-flex-violet/30 via-ink-700 to-flex-pink/20">
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="text-zinc-400">
            <Radio className="mx-auto mb-2 h-8 w-8 text-flex-pink" />
            <p className="text-sm">{ready ? 'Salon live actif' : 'Connexion…'}</p>
            <p className="mt-1 text-xs text-zinc-600">Vidéo bientôt (Agora)</p>
          </div>
        </div>
        <AnimatePresence>
          {gifts.map((g) => (
            <motion.div
              key={g.id}
              initial={{ y: 0, opacity: 0, scale: 0.6 }}
              animate={{ y: -160, opacity: 1, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              style={{ left: `${15 + (g.id.charCodeAt(g.id.length - 1) % 70)}%` }}
              className="pointer-events-none absolute bottom-4 text-3xl"
            >
              {g.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Chat live */}
      <div ref={listRef} className="mt-3 flex-1 space-y-2 overflow-y-auto px-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-600">Lance la conversation ✦</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-2">
            <Avatar name={m.username} url={null} size={28} />
            <div className="rounded-2xl rounded-tl-sm bg-ink-800/70 px-3 py-1.5">
              <span className="mr-1.5 text-xs font-bold text-gold">@{m.username}</span>
              <span className="text-sm text-zinc-100">{m.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cadeaux + saisie */}
      <div className="safe-bottom px-4 pb-3 pt-2">
        <div className="mb-2 flex justify-center gap-2">
          {GIFTS.map((g) => (
            <button
              key={g}
              onClick={() => sendGift(g)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-xl active:scale-90"
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Dis quelque chose…"
            maxLength={140}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
          />
          <button
            onClick={sendChat}
            disabled={!text.trim()}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-grad text-ink-900 active:scale-90 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
