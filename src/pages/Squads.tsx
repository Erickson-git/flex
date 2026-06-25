import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Plus, Users, X } from 'lucide-react'
import type { Squad } from '@/lib/types'
import { DEMO_SQUADS } from '@/lib/demoData'
import { createTeuf, getTeufs } from '@/lib/social'
import { blockIfGuest } from '@/lib/guard'
import { DEMO_MANGA_CLANS } from '@/lib/otaku'
import { MEDIA, squadCover } from '@/lib/media'
import { SmartImage } from '@/components/SmartImage'
import { TeufCard } from '@/components/TeufCard'
import { compact, cn, haptic, uid } from '@/lib/utils'

const ACCENTS = [
  'from-gold to-flex-pink',
  'from-flex-pink to-flex-violet',
  'from-flex-violet to-flex-cyan',
  'from-flex-cyan to-gold',
]

export default function Squads() {
  const navigate = useNavigate()
  const [squads, setSquads] = useState<Squad[]>(DEMO_SQUADS)
  const [teufs, setTeufs] = useState<Squad[]>(() => getTeufs())
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  function create() {
    if (blockIfGuest()) return
    const n = name.trim()
    if (!n) return
    haptic([10, 30, 10])
    const sq: Squad = {
      id: 'sq_' + uid(),
      name: n,
      topic: 'Nouveau cercle',
      emoji: '✨',
      cover_url: squadCover(n.length + squads.length),
      members_count: 1,
      accent: ACCENTS[squads.length % ACCENTS.length],
    }
    setSquads((s) => [sq, ...s])
    setCreating(false)
    setName('')
    navigate(`/app/squads/${sq.id}`, { state: sq })
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-ink-900/80 px-5 pb-3 pt-2 backdrop-blur-xl">
        <h1 className="font-display text-3xl font-extrabold">
          The <span className="text-gold-grad">Squads</span>
        </h1>
        <button
          onClick={() => {
            haptic(10)
            setCreating(true)
          }}
          className="flex items-center gap-1.5 rounded-full bg-gold-grad px-4 py-2 text-sm font-bold text-ink-900 active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Créer
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        {squads.map((sq, i) => (
          <motion.button
            key={sq.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            onClick={() => {
              haptic(8)
              navigate(`/app/squads/${sq.id}`, { state: sq })
            }}
            className="relative h-40 overflow-hidden rounded-3xl text-left"
          >
            <SmartImage src={sq.cover_url} seed={sq.name.length + i} className="absolute inset-0" />
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 mix-blend-overlay', sq.accent)} />
            <div className="absolute inset-0 flex flex-col justify-between p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-3xl drop-shadow">{sq.emoji}</span>
                {sq.secret && (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900/60 text-gold">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div>
                <div className="font-display text-xl font-extrabold text-white drop-shadow">{sq.name}</div>
                <div className="text-[11px] text-white/70">{sq.topic}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/90">
                  <Users className="h-3 w-3" />
                  {compact(sq.members_count)}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Teufs (événements / fêtes) */}
      <div className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">
            Les <span className="text-gold-grad">Teufs</span> 🎉
          </h2>
          <button
            onClick={() => {
              haptic([10, 30, 10])
              const teuf = createTeuf({
                name: 'Ma Teuf',
                topic: 'Fête organisée à l’instant',
                emoji: '🎉',
                cover_url: MEDIA.nightlife[teufs.length % 4],
                accent: 'from-gold to-flex-pink',
                date: new Date(Date.now() + 86_400_000 * 3).toISOString(),
                price: 0,
                location: 'À définir',
                map_url: 'https://maps.google.com',
              })
              setTeufs((t) => [teuf, ...t])
              navigate(`/app/squads/${teuf.id}`, { state: teuf })
            }}
            className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-bold text-gold active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={3} /> Teuf
          </button>
        </div>
        <div className="space-y-3">
          {teufs.map((t) => (
            <TeufCard key={t.id} teuf={t} />
          ))}
        </div>
      </div>

      {/* Manga Clans (watchparties + scans) */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 font-display text-xl font-extrabold">
          Manga <span className="text-gold-grad">Clans</span> 🍥
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {DEMO_MANGA_CLANS.map((sq, i) => (
            <motion.button
              key={sq.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              onClick={() => {
                haptic(8)
                navigate(`/app/squads/${sq.id}`, { state: sq })
              }}
              className="relative h-36 overflow-hidden rounded-3xl text-left"
            >
              <SmartImage src={sq.cover_url} seed={sq.name.length + i + 9} className="absolute inset-0" />
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 mix-blend-overlay', sq.accent)} />
              <div className="absolute inset-0 flex flex-col justify-between p-3.5">
                <span className="w-fit rounded-full bg-ink-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flex-pink">
                  Watchparty
                </span>
                <div>
                  <div className="font-display text-lg font-extrabold text-white drop-shadow">
                    {sq.emoji} {sq.name}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-white/90">
                    <Users className="h-3 w-3" />
                    {compact(sq.members_count)}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Création express */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl border-t border-white/10 bg-ink-800 p-6 pb-10"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Nouveau Squad</h2>
                <button onClick={() => setCreating(false)} className="text-zinc-500">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder="Nom du cercle (ex: Afro Vibes)"
                className="input-luxe"
              />
              <button onClick={create} disabled={!name.trim()} className="btn-gold mt-4 w-full disabled:opacity-30">
                Lancer le Squad
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
