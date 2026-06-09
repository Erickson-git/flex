import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Clock, Eye, Send } from 'lucide-react'
import { fetchSecretMessages, sendSecretMessage } from '@/lib/api'
import type { SecretMessage } from '@/lib/types'
import { clearGhostTraces, useAuth } from '@/store/useAuth'
import { HideoutLock } from '@/components/HideoutLock'
import { EphemeralMessage } from '@/components/EphemeralMessage'
import { cn, haptic } from '@/lib/utils'

const HIDEOUT_ID = 'salon-prive'
const TTL_OPTIONS = [
  { label: '10 s', value: 10 },
  { label: '30 s', value: 30 },
  { label: '1 min', value: 60 },
]

export default function Hideouts() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)

  function leaveGhost() {
    haptic(12)
    clearGhostTraces() // tout s'efface en quittant
    navigate('/app', { replace: true })
  }
  const [messages, setMessages] = useState<SecretMessage[]>([])
  const [draft, setDraft] = useState('')
  const [ttl, setTtl] = useState(30)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!unlocked) return
    let active = true
    const load = () => fetchSecretMessages(HIDEOUT_ID).then((m) => active && setMessages(m))
    load()
    const t = setInterval(load, 3000) // rafraîchit (et purge les expirés)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [unlocked])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  if (!unlocked) return <HideoutLock onUnlock={() => setUnlocked(true)} />
  if (!me) return null

  async function send() {
    const text = draft.trim()
    if (!text) return
    haptic(10)
    setDraft('')
    const msg = await sendSecretMessage(HIDEOUT_ID, text, ttl, me!)
    setMessages((m) => [...m, msg])
  }

  function expire(id: string) {
    setMessages((m) => m.filter((x) => x.id !== id))
  }

  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col">
      <header className="safe-top border-b border-white/5 px-5 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">The Hideouts</h1>
          <span className="rounded-full bg-flex-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flex-violet">
            éphémère
          </span>
          <button
            onClick={leaveGhost}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 active:scale-95"
          >
            <Eye className="h-4 w-4" />
            Revenir au public
          </button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          Ce qui se dit ici disparaît. Rien n’est archivé.
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="grid h-full place-items-center text-center text-sm text-zinc-600">
            <div>
              <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Salon vide. Lance la première étincelle. 🔥
              <br />
              Tes messages s’autodétruisent.
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <EphemeralMessage key={m.id} msg={m} mine={m.author_id === me.id} onExpire={expire} />
          ))}
        </AnimatePresence>
      </div>

      {/* sélecteur de durée de vie */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <span className="text-xs text-zinc-500">Disparaît après :</span>
        {TTL_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setTtl(o.value)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold transition',
              ttl === o.value ? 'bg-gold text-ink-900' : 'bg-white/5 text-zinc-400',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="safe-bottom flex items-center gap-2 border-t border-white/5 px-4 pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message éphémère…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 transition active:scale-90 disabled:opacity-30"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
