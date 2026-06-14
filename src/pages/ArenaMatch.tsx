import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Sparkle } from 'lucide-react'
import type { ArenaMatch as Match } from '@/lib/types'
import { getMatch, placeBet, settleBet, settleDuel } from '@/lib/arena'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { useEmojiBurst } from '@/components/EmojiBurst'
import { Avatar } from '@/components/Avatar'
import { ArenaChat } from '@/components/ArenaChat'
import { VibePlayer } from '@/components/VibePlayer'
import { cn, compact, haptic } from '@/lib/utils'

const DURATION = 10_000

export default function ArenaMatch() {
  const { id = '' } = useParams()
  const location = useLocation()
  const match = (location.state as Match | null) ?? getMatch(id)

  if (!match) {
    return (
      <div className="grid min-h-[100dvh] place-items-center text-zinc-500">Match introuvable.</div>
    )
  }
  return match.featured ? <Spectator match={match} /> : <Duel match={match} />
}

// ════════════════════════ DUEL (joueur) ════════════════════════
function Duel({ match }: { match: Match }) {
  const me = useAuth((s) => s.me)
  const refresh = useEconomy((s) => s.refresh)
  const { blast } = useEmojiBurst()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<'ready' | 'fight' | 'done'>('ready')
  const [left, setLeft] = useState(DURATION)
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const aRef = useRef(0)
  const bRef = useRef(0)
  const [delta, setDelta] = useState(0)

  function start() {
    haptic(20)
    setPhase('fight')
    const end = Date.now() + DURATION
    const botStep = 130 + (match.id.length % 60) // cadence de l'adversaire
    const bot = setInterval(() => {
      bRef.current += 1 + Math.floor(Math.random() * 2)
      setB(bRef.current)
    }, botStep)
    const timer = setInterval(() => {
      const l = end - Date.now()
      if (l <= 0) {
        clearInterval(bot)
        clearInterval(timer)
        finish()
      } else setLeft(l)
    }, 80)
  }

  async function finish() {
    setPhase('done')
    const won = aRef.current >= bRef.current
    blast(won ? '🎉' : '💀')
    if (me) {
      const d = await settleDuel(match, aRef.current, bRef.current, me)
      setDelta(d)
      await refresh(me.id)
    }
  }

  function tap() {
    if (phase !== 'fight') return
    aRef.current += 1
    setA(aRef.current)
    if (aRef.current % 5 === 0) haptic(8)
  }

  const total = a + b || 1
  const aShare = a / total
  const won = a >= b

  return (
    <div
      onPointerDown={tap}
      className="relative flex min-h-[100dvh] select-none flex-col overflow-hidden bg-noir-grad"
    >
      <Backdrop />
      <header className="safe-top relative z-10 flex items-center justify-between px-4 pt-2">
        <button onClick={() => navigate('/app/arena')} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-sm font-bold text-gold">
          <Sparkle className="h-4 w-4" /> {compact(match.stake)}
        </span>
      </header>

      {/* Compte à rebours */}
      <div className="relative z-10 mt-2 text-center">
        <motion.div
          key={Math.ceil(left / 1000)}
          initial={{ scale: 1.4, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display text-6xl font-extrabold text-white"
        >
          {phase === 'done' ? '0' : Math.ceil(left / 1000)}
        </motion.div>
      </div>

      {/* Combattants */}
      <div className="relative z-10 flex flex-1 items-center justify-around px-6">
        <Fighter name={match.a.name} avatar={match.a.avatar} taps={a} share={aShare} color="from-flex-cyan to-flex-violet" />
        <Fighter name={match.b.name} avatar={match.b.avatar} taps={b} share={1 - aShare} color="from-flex-pink to-gold" mirror />
      </div>

      {/* Jauge d'énergie */}
      <div className="relative z-10 mx-6 mb-4 h-4 overflow-hidden rounded-full bg-ink-700">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-flex-cyan to-flex-violet"
          animate={{ width: `${aShare * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/40" />
      </div>

      {/* Zone de tap / états */}
      <div className="safe-bottom relative z-10 px-6 pb-8">
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.button
              key="ready"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              transition={{ scale: { repeat: Infinity, duration: 1.2 } }}
              onPointerDown={(e) => {
                e.stopPropagation()
                start()
              }}
              className="btn-gold w-full py-5 text-xl"
            >
              TAP TO FIGHT
            </motion.button>
          )}
          {phase === 'fight' && (
            <motion.div
              key="fight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl border-2 border-dashed border-white/20 py-6 text-center text-lg font-bold text-white/80"
            >
              TAPE PARTOUT ! ⚡
            </motion.div>
          )}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className={cn('font-display text-4xl font-extrabold', won ? 'text-gold-grad' : 'text-zinc-400')}>
                {won ? 'VICTOIRE ✦' : 'DÉFAITE'}
              </div>
              <div className={cn('mt-1 text-lg font-bold', won ? 'text-gold' : 'text-flex-pink')}>
                {delta >= 0 ? '+' : ''}
                {delta} Sparks
              </div>
              <button onClick={() => navigate('/app/arena')} className="btn-gold mt-5 w-full">
                Rejouer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ════════════════════════ SPECTATEUR (paris) ════════════════════
function Spectator({ match }: { match: Match }) {
  const me = useAuth((s) => s.me)
  const wallet = useEconomy((s) => s.wallet)
  const refresh = useEconomy((s) => s.refresh)
  const { blast } = useEmojiBurst()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<'bet' | 'watch' | 'done'>('bet')
  const [side, setSide] = useState<'a' | 'b'>('a')
  const [stake, setStake] = useState(50)
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [result, setResult] = useState<{ won: boolean; gain: number } | null>(null)
  const aRef = useRef(0)
  const bRef = useRef(0)

  async function bet() {
    if (!me || (wallet?.sparks ?? 0) < stake) return
    haptic([10, 30, 10])
    await placeBet(match.id, side, stake, me)
    await refresh(me.id)
    runDuel()
  }

  function runDuel() {
    setPhase('watch')
    const end = Date.now() + DURATION
    const ra = 120 + Math.floor(Math.random() * 80)
    const rb = 120 + Math.floor(Math.random() * 80)
    const ta = setInterval(() => {
      aRef.current += 1 + Math.floor(Math.random() * 2)
      setA(aRef.current)
    }, ra)
    const tb = setInterval(() => {
      bRef.current += 1 + Math.floor(Math.random() * 2)
      setB(bRef.current)
    }, rb)
    const timer = setInterval(async () => {
      if (Date.now() >= end) {
        clearInterval(ta)
        clearInterval(tb)
        clearInterval(timer)
        const winner = aRef.current >= bRef.current ? 'a' : 'b'
        blast(winner === side ? '🎉' : '💀')
        const r = me ? await settleBet(match.id, winner, me) : null
        if (me) await refresh(me.id)
        setResult(r ? { won: r.won, gain: r.gain } : { won: false, gain: 0 })
        setPhase('done')
      }
    }, 120)
  }

  const total = a + b || 1
  return (
    <div className="flex h-[100dvh] flex-col bg-noir-grad">
      <header className="safe-top flex items-center justify-between px-4 pb-2 pt-2">
        <button onClick={() => navigate('/app/arena')} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-sm font-bold text-zinc-300">Duel de stars</span>
        <span className="flex items-center gap-1 text-sm font-bold text-gold">
          <Sparkle className="h-4 w-4" /> {compact(match.stake)}
        </span>
      </header>

      {/* Visualisation du duel */}
      <div className="flex items-center justify-around px-6 py-4">
        <Fighter name={match.a.name} avatar={match.a.avatar} taps={a} share={a / total} color="from-flex-cyan to-flex-violet" />
        <span className="font-display text-2xl font-extrabold text-zinc-600">VS</span>
        <Fighter name={match.b.name} avatar={match.b.avatar} taps={b} share={b / total} color="from-flex-pink to-gold" mirror />
      </div>
      <div className="mx-6 mb-2 h-3 overflow-hidden rounded-full bg-ink-700">
        <motion.div className="h-full bg-gradient-to-r from-flex-cyan to-flex-violet" animate={{ width: `${(a / total) * 100}%` }} />
      </div>

      {/* Paris */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {phase === 'bet' && (
            <motion.div key="bet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-2 grid grid-cols-2 gap-2">
                {(['a', 'b'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={cn(
                      'rounded-2xl border py-3 text-sm font-bold transition',
                      side === s ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-zinc-300',
                    )}
                  >
                    {s === 'a' ? match.a.name : match.b.name}
                  </button>
                ))}
              </div>
              <div className="mb-2 flex gap-2">
                {[50, 100, 250].map((v) => (
                  <button
                    key={v}
                    onClick={() => setStake(v)}
                    className={cn(
                      'flex-1 rounded-xl border py-2 text-sm font-bold transition',
                      stake === v ? 'border-flex-cyan bg-flex-cyan/15 text-flex-cyan' : 'border-white/10 text-zinc-400',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button onClick={bet} disabled={(wallet?.sparks ?? 0) < stake} className="btn-gold w-full disabled:opacity-40">
                Parier {stake} ✦ sur {side === 'a' ? match.a.name : match.b.name}
              </button>
            </motion.div>
          )}
          {phase === 'watch' && (
            <div className="py-2 text-center text-sm font-bold text-white/70">Ça tape fort… 🔥</div>
          )}
          {phase === 'done' && result && (
            <motion.div key="done" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-1 text-center">
              <div className={cn('font-display text-2xl font-extrabold', result.won ? 'text-gold-grad' : 'text-zinc-400')}>
                {result.won ? `GAGNÉ +${result.gain} ✦` : 'Perdu cette fois'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vibe Audio du duel (ambiance) */}
      {match.a.music && (
        <div className="px-4 pt-3">
          <VibePlayer url={match.a.music} label="Ambiance du duel" />
        </div>
      )}

      {/* Chat spectateurs en direct */}
      <div className="mt-2 min-h-0 flex-1 border-t border-white/5">
        <ArenaChat roomId={match.id} />
      </div>
    </div>
  )
}

// ── Sous-composants ─────────────────────────────────────────────
function Fighter({
  name,
  avatar,
  taps,
  share,
  color,
  mirror,
}: {
  name: string
  avatar: string | null
  taps: number
  share: number
  color: string
  mirror?: boolean
}) {
  const scale = 0.9 + share * 0.5
  return (
    <div className={cn('flex flex-col items-center gap-2', mirror && 'text-right')}>
      <motion.div animate={{ scale }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="relative">
        <span className={cn('absolute -inset-2 rounded-full bg-gradient-to-br opacity-40 blur-xl', color)} />
        <Avatar name={name} url={avatar} size={84} ring />
      </motion.div>
      <span className="max-w-[90px] truncate text-sm font-bold text-white">{name}</span>
      <span className="font-display text-2xl font-extrabold text-white tabular-nums">{taps}</span>
    </div>
  )
}

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-flex-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-40 h-56 w-56 rounded-full bg-flex-pink/20 blur-3xl" />
    </>
  )
}
