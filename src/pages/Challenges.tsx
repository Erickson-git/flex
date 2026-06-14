import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Crown, Loader2, Plus, Swords, Trophy } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import {
  createChallenge,
  declareWinner,
  fetchChallenges,
  fetchMyUnlocks,
  fetchParticipants,
  featureLabel,
  joinChallenge,
  REWARD_FEATURES,
  type Challenge,
  type Participant,
  type Unlock,
} from '@/lib/challenges'
import { Avatar } from '@/components/Avatar'
import { useEmojiBurst } from '@/components/EmojiBurst'
import { haptic } from '@/lib/utils'

function timeLeft(ends: string): string {
  const ms = new Date(ends).getTime() - Date.now()
  if (ms <= 0) return 'Terminé'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Challenges() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const { blast } = useEmojiBurst()
  const [list, setList] = useState<Challenge[]>([])
  const [unlocks, setUnlocks] = useState<Unlock[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // formulaire
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [feature, setFeature] = useState(REWARD_FEATURES[0].key)
  const [days, setDays] = useState(7)
  const [hours, setHours] = useState(24)
  const [submitting, setSubmitting] = useState(false)

  async function refresh() {
    const [c, u] = await Promise.all([fetchChallenges(), fetchMyUnlocks()])
    setList(c)
    setUnlocks(u)
    setLoading(false)
  }
  useEffect(() => {
    refresh()
  }, [])

  async function submit() {
    if (!me || !title.trim() || submitting) return
    setSubmitting(true)
    haptic([10, 30, 10])
    try {
      await createChallenge({ title: title.trim(), description: desc.trim(), reward_feature: feature, reward_days: days, hours }, me.id)
      setTitle('')
      setDesc('')
      setCreating(false)
      await refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <header className="safe-top flex items-center justify-between py-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-xl font-extrabold text-gold-grad">Cercle des Défis</h1>
        <button onClick={() => setCreating((v) => !v)} className="rounded-full bg-gold-grad p-2 text-ink-900 active:scale-90">
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Mes récompenses débloquées */}
      {unlocks.length > 0 && (
        <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/[0.06] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold">
            <Crown className="h-3.5 w-3.5" /> Tes débloquages actifs
          </div>
          <div className="flex flex-wrap gap-2">
            {unlocks.map((u) => (
              <span key={u.feature} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-200">
                {featureLabel(u.feature)} · jusqu'au {new Date(u.until).toLocaleDateString('fr')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire de création */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-800/60 p-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                placeholder="Intitulé du défi (ex: Meilleur fit de la soirée)"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 240))}
                placeholder="Conditions de victoire…"
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
              />
              <div>
                <div className="mb-1.5 text-xs text-zinc-500">Récompense (fonctionnalité débloquée)</div>
                <div className="flex flex-wrap gap-2">
                  {REWARD_FEATURES.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFeature(f.key)}
                      className={
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
                        (feature === f.key ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-zinc-300')
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <label className="flex-1 text-xs text-zinc-500">
                  Durée récompense (jours)
                  <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.min(90, Math.max(1, +e.target.value || 1)))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none" />
                </label>
                <label className="flex-1 text-xs text-zinc-500">
                  Timer du défi (heures)
                  <input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(Math.min(168, Math.max(1, +e.target.value || 1)))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none" />
                </label>
              </div>
              <button onClick={submit} disabled={!title.trim() || submitting} className="btn-gold w-full disabled:opacity-40">
                {submitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Lancer le défi'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des défis */}
      {loading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" /></div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-600">Aucun défi pour l'instant. Lance le premier ✦</div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <ChallengeCard key={c.id} c={c} meId={me?.id} onWin={() => blast('🏆')} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ c, meId, onWin, onChanged }: { c: Challenge; meId?: string; onWin: () => void; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [parts, setParts] = useState<Participant[]>([])
  const isMine = c.creator_id === meId
  const open = c.status === 'open'

  async function join() {
    if (!meId) return
    setBusy(true)
    try {
      await joinChallenge(c.id, meId)
      haptic(10)
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function openPicker() {
    setPickOpen((v) => !v)
    if (parts.length === 0) setParts(await fetchParticipants(c.id))
  }

  async function pick(uid: string) {
    setBusy(true)
    try {
      await declareWinner(c.id, uid)
      onWin()
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Swords className="h-4 w-4 text-flex-pink" /> {c.title}
          </div>
          {c.description && <p className="mt-1 text-sm text-zinc-400">{c.description}</p>}
          <div className="mt-1 text-xs text-zinc-500">par @{c.creator?.username ?? '?'}</div>
        </div>
        <span className="shrink-0 rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
          {featureLabel(c.reward_feature)} · {c.reward_days}j
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={open ? 'text-xs text-zinc-400' : 'flex items-center gap-1 text-xs font-bold text-gold'}>
          {open ? `⏳ ${timeLeft(c.ends_at)}` : <><Trophy className="h-3.5 w-3.5" /> Récompense attribuée</>}
        </span>
        {open && (
          isMine ? (
            <button onClick={openPicker} disabled={busy} className="rounded-xl border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold active:scale-95 disabled:opacity-50">
              Déclarer le vainqueur
            </button>
          ) : (
            <button onClick={join} disabled={busy} className="rounded-xl bg-gold-grad px-4 py-1.5 text-xs font-bold text-ink-900 active:scale-95 disabled:opacity-50">
              {busy ? '…' : 'Rejoindre'}
            </button>
          )
        )}
      </div>

      <AnimatePresence>
        {pickOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 border-t border-white/5 pt-3">
              <div className="mb-2 text-xs text-zinc-500">Choisis le gagnant (parmi les participants) :</div>
              {parts.length === 0 ? (
                <div className="text-xs text-zinc-600">Aucun participant pour l'instant.</div>
              ) : (
                <div className="space-y-1.5">
                  {parts.map((p) => (
                    <button key={p.user_id} onClick={() => pick(p.user_id)} disabled={busy} className="flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 active:scale-[0.98] disabled:opacity-50">
                      <Avatar name={p.username ?? '?'} url={p.avatar_url ?? null} size={28} />
                      <span className="flex-1 text-left text-sm text-white">@{p.username}</span>
                      <Crown className="h-4 w-4 text-gold" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
