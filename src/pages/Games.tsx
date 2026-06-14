import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Loader2, Sparkle, Trophy } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { fetchLeaderboard, submitScore, type LeaderRow } from '@/lib/games'
import { Avatar } from '@/components/Avatar'
import { haptic } from '@/lib/utils'

const GAME = 'spark_tap'
const DURATION = 20

type Phase = 'idle' | 'playing' | 'over'

export default function Games() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [board, setBoard] = useState<LeaderRow[]>([])
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const scoreRef = useRef(0)

  async function loadBoard() {
    setLoadingBoard(true)
    try {
      setBoard(await fetchLeaderboard(GAME))
    } finally {
      setLoadingBoard(false)
    }
  }

  useEffect(() => {
    loadBoard()
  }, [])

  // Compte à rebours
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      finish()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  function relocate() {
    setPos({ x: 8 + Math.random() * 84, y: 10 + Math.random() * 78 })
  }

  function start() {
    haptic(12)
    scoreRef.current = 0
    setScore(0)
    setTimeLeft(DURATION)
    relocate()
    setPhase('playing')
  }

  function hit() {
    if (phase !== 'playing') return
    haptic(8)
    scoreRef.current += 1
    setScore(scoreRef.current)
    relocate()
  }

  async function finish() {
    setPhase('over')
    const final = scoreRef.current
    if (me && final > 0) {
      setSubmitting(true)
      try {
        await submitScore(me.id, GAME, final)
        await loadBoard()
      } finally {
        setSubmitting(false)
      }
    }
  }

  const myRank = board.findIndex((r) => r.user_id === me?.id)

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col pb-10">
      <header className="safe-top flex items-center justify-between px-4 pb-2 pt-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-display text-xl font-extrabold text-gold-grad">Spark Tap</span>
        <div className="w-10" />
      </header>

      {/* Aire de jeu */}
      <div className="px-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-white">Score · {score}</span>
          <span className={timeLeft <= 5 && phase === 'playing' ? 'font-bold text-flex-pink' : 'text-zinc-400'}>
            {phase === 'playing' ? `${timeLeft}s` : `${DURATION}s`}
          </span>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-ink-800/60">
          {/* halos d'ambiance */}
          <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-flex-violet/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-8 bottom-6 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />

          {phase === 'playing' && (
            <motion.button
              key={`${pos.x}-${pos.y}`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={hit}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 grid h-14 w-14 place-items-center rounded-full bg-gold-grad text-ink-900 shadow-glow active:scale-90"
              aria-label="Tape l'étincelle"
            >
              <Sparkle className="h-7 w-7" strokeWidth={2.5} />
            </motion.button>
          )}

          {phase !== 'playing' && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                {phase === 'over' && (
                  <>
                    <div className="font-display text-5xl font-extrabold text-gold-grad">{score}</div>
                    <div className="mb-4 mt-1 text-sm text-zinc-400">
                      {submitting ? 'Enregistrement…' : 'étincelles attrapées'}
                    </div>
                  </>
                )}
                {phase === 'idle' && (
                  <p className="mb-4 max-w-[16rem] text-sm text-zinc-400">
                    Tape un maximum d’étincelles en {DURATION} secondes. Bats le classement.
                  </p>
                )}
                <button onClick={start} className="btn-gold inline-flex items-center gap-2">
                  <Sparkle className="h-5 w-5" />
                  {phase === 'over' ? 'Rejouer' : 'Jouer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Classement */}
      <div className="mt-6 px-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Trophy className="h-4 w-4 text-gold" /> Classement mondial
        </div>
        {loadingBoard ? (
          <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
        ) : board.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-600">Sois le premier à marquer ! ✦</div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {board.map((r, i) => (
                <motion.div
                  key={r.user_id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
                    r.user_id === me?.id ? 'border-gold/40 bg-gold/10' : 'border-white/5 bg-ink-800/50'
                  }`}
                >
                  <span className={`w-6 text-center font-display text-lg font-extrabold ${i < 3 ? 'text-gold' : 'text-zinc-500'}`}>
                    {i + 1}
                  </span>
                  <Avatar name={r.username} url={r.avatar_url} size={32} />
                  <span className="flex-1 truncate text-sm font-semibold text-white">@{r.username}</span>
                  <span className="font-bold text-gold">{r.best}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {myRank >= 0 && (
          <p className="mt-3 text-center text-xs text-zinc-500">Tu es #{myRank + 1} au classement ✦</p>
        )}
      </div>
    </div>
  )
}
