import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Send, X } from 'lucide-react'
import { fetchMyAgent, levelProgress, type Agent } from '@/lib/agents'
import { sendAgentMessage } from '@/lib/agentChat'
import { useAuth } from '@/store/useAuth'
import { haptic } from '@/lib/utils'

/**
 * « Mon IA » — compagnon évolutif. Affiche niveau + complicité (XP), et
 * ouvre un chat avec l'agent (cerveau LLM via l'Edge Function agent-chat).
 * Ne s'affiche pas si agents.sql n'a pas été exécuté.
 */
type Msg = { who: 'me' | 'ia'; text: string }

export function AiCompanion() {
  const me = useAuth((s) => s.me)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!me) return
    fetchMyAgent(me.id).then(setAgent).catch(() => {})
  }, [me])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [msgs, open])

  if (!agent) return null

  const prog = levelProgress(agent.xp)
  const glow = Math.min(0.6, 0.15 + agent.level * 0.05)

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMsgs((m) => [...m, { who: 'me', text }])
    setSending(true)
    haptic(8)
    try {
      const reply = await sendAgentMessage(text)
      setMsgs((m) => [...m, { who: 'ia', text: reply || '…' }])
    } catch {
      setMsgs((m) => [
        ...m,
        { who: 'ia', text: "⚙️ Mon cerveau n'est pas encore activé. Déploie l'Edge Function « agent-chat » + ta clé ANTHROPIC_API_KEY sur Supabase." },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-2xl border border-flex-violet/30 bg-flex-violet/[0.06] p-4">
        <div className="flex items-center gap-3">
          <motion.span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-flex-violet to-flex-cyan text-white"
            style={{ boxShadow: `0 0 28px -4px rgba(139,92,246,${glow})` }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bot className="h-5 w-5" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate font-bold text-white">{agent.name}</span>
              <span className="rounded-full bg-flex-violet/20 px-2 py-0.5 text-[11px] font-bold text-flex-violet">
                Niveau {agent.level}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-flex-violet to-flex-cyan"
                initial={{ width: 0 }}
                animate={{ width: `${prog * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Complicité {agent.xp} XP · apprend de toi à chaque Flex
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            haptic(10)
            setOpen(true)
          }}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-flex-violet to-flex-cyan py-2 text-xs font-bold text-white active:scale-[0.98]"
        >
          💬 Chatter avec mon IA
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] grid place-items-end bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 320 }}
              animate={{ y: 0 }}
              exit={{ y: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-[80dvh] w-full flex-col rounded-t-3xl border-t border-white/10 bg-ink-800"
            >
              <header className="flex items-center justify-between px-5 py-3">
                <span className="flex items-center gap-2 font-bold text-white">
                  <Bot className="h-5 w-5 text-flex-violet" /> {agent.name}
                </span>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-zinc-400">
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 pb-2">
                {msgs.length === 0 && (
                  <p className="py-10 text-center text-sm text-zinc-500">
                    Demande-moi un concept de story, une légende qui claque, ou un plan pour percer ✦
                  </p>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={m.who === 'me' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ' +
                        (m.who === 'me'
                          ? 'rounded-br-sm bg-gold-grad text-ink-900'
                          : 'rounded-bl-sm bg-white/[0.06] text-zinc-100')
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {sending && <div className="text-xs text-zinc-500">Mon IA réfléchit…</div>}
              </div>

              <div className="safe-bottom flex items-center gap-2 px-4 pb-3 pt-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Parle à ton IA…"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-flex-violet/60"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-r from-flex-violet to-flex-cyan text-white active:scale-90 disabled:opacity-40"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
