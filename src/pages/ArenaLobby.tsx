import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Radio, Sparkle, Swords, Zap } from 'lucide-react'
import { createQuickMatch, featuredMatches } from '@/lib/arena'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { Avatar } from '@/components/Avatar'
import { SparksChip } from '@/components/SparksChip'
import { compact, cn, haptic } from '@/lib/utils'

const STAKES = [50, 100, 250, 500]

export default function ArenaLobby() {
  const me = useAuth((s) => s.me)
  const wallet = useEconomy((s) => s.wallet)
  const navigate = useNavigate()
  const [pick, setPick] = useState(false)
  const [stake, setStake] = useState(100)
  const featured = featuredMatches()

  async function launch() {
    if (!me) return
    haptic([10, 30, 10])
    const match = await createQuickMatch(me, stake)
    setPick(false)
    navigate(`/app/arena/${match.id}`, { state: match })
  }

  const canAfford = (wallet?.sparks ?? 0) >= stake

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-ink-900/80 px-5 pb-3 pt-2 backdrop-blur-xl">
        <h1 className="font-display text-3xl font-extrabold">
          The <span className="text-gold-grad">Arena</span>
        </h1>
        <SparksChip />
      </header>

      {/* CTA duel express */}
      <div className="px-4 pt-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            haptic(12)
            setPick(true)
          }}
          className="relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-flex-violet via-flex-pink to-gold p-5 text-left shadow-glow-pink"
        >
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-900/30">
            <Swords className="h-9 w-9 text-white" />
          </div>
          <div className="relative">
            <div className="font-display text-2xl font-extrabold text-white">DUEL EXPRESS</div>
            <div className="text-sm font-medium text-white/80">Tape plus vite. Rafle les Sparks.</div>
          </div>
        </motion.button>
      </div>

      {/* À l'affiche (paris) */}
      <div className="px-4 pt-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Radio className="h-4 w-4 text-flex-pink" /> À l’affiche · pariez
        </div>
        <div className="space-y-3">
          {featured.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => {
                haptic(8)
                navigate(`/app/arena/${m.id}`, { state: m })
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-ink-800/70 p-3"
            >
              <Side avatar={m.a.avatar} name={m.a.name} align="left" />
              <div className="flex flex-col items-center px-2">
                <span className="text-[10px] font-bold text-zinc-500">VS</span>
                <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-bold text-gold">
                  <Sparkle className="h-3 w-3" />
                  {compact(m.stake)}
                </span>
                {m.status === 'live' && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-flex-pink">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flex-pink" /> LIVE
                  </span>
                )}
              </div>
              <Side avatar={m.b.avatar} name={m.b.name} align="right" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sélecteur de mise */}
      <AnimatePresence>
        {pick && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPick(false)}
            className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 240 }}
              animate={{ y: 0 }}
              exit={{ y: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl border-t border-white/10 bg-ink-800 p-6 pb-10"
            >
              <h2 className="mb-1 text-xl font-bold">Ta mise</h2>
              <p className="mb-4 text-sm text-zinc-500">Le gagnant rafle la mise de l’adversaire.</p>
              <div className="grid grid-cols-4 gap-2">
                {STAKES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStake(s)}
                    className={cn(
                      'flex flex-col items-center rounded-2xl border py-3 font-bold transition',
                      stake === s ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-zinc-300',
                    )}
                  >
                    <Sparkle className="mb-1 h-4 w-4" />
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={launch}
                disabled={!canAfford}
                className="btn-gold mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-40"
              >
                <Zap className="h-5 w-5" />
                {canAfford ? 'Entrer dans l’Arène' : 'Sparks insuffisants'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Side({ avatar, name, align }: { avatar: string | null; name: string; align: 'left' | 'right' }) {
  return (
    <div className={cn('flex flex-1 items-center gap-2', align === 'right' && 'flex-row-reverse text-right')}>
      <Avatar name={name} url={avatar} size={48} ring />
      <span className="truncate text-sm font-semibold text-white">{name}</span>
    </div>
  )
}
