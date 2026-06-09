import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Sparkle } from 'lucide-react'
import type { ProfileView } from '@/lib/types'
import { fetchProfileViews } from '@/lib/economy'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { haptic, timeAgo } from '@/lib/utils'

const REVEAL_COST = 50

/**
 * Shadow Profile : on montre que des gens regardent le profil, mais leur
 * identité est floutée. Lever le voile coûte des Sparks (sink déflationniste
 * + moteur de curiosité / FOMO).
 */
export function ShadowVisitors() {
  const me = useAuth((s) => s.me)
  const reveal = useEconomy((s) => s.reveal)
  const [views, setViews] = useState<ProfileView[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!me) return
    fetchProfileViews(me.id)
      .then(setViews)
      .finally(() => setLoading(false))
  }, [me])

  if (!me) return null

  async function onReveal(v: ProfileView) {
    if (busy) return
    setBusy(v.id)
    haptic([10, 30, 10])
    try {
      const name = await reveal(me!.id, v.id)
      setViews((list) => list.map((x) => (x.id === v.id ? { ...x, revealed: true, viewer_name: name } : x)))
    } catch {
      /* solde insuffisant */
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/5 bg-ink-800/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-flex-violet" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
          {views.length} regards dans l’ombre
        </h2>
      </div>

      {loading ? (
        <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-zinc-500" />
      ) : (
        <div className="space-y-2">
          {views.map((v) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-flex-violet/20">
                <Eye className="h-4 w-4 text-flex-violet" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={'truncate text-sm font-semibold ' + (v.revealed ? 'text-gold' : 'text-zinc-400 blur-[3px] select-none')}>
                  {v.revealed ? v.viewer_name : 'Profil masqué'}
                </div>
                <div className="text-[11px] text-zinc-600">{timeAgo(v.created_at)}</div>
              </div>
              {!v.revealed && (
                <button
                  onClick={() => onReveal(v)}
                  disabled={!!busy}
                  className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold transition active:scale-95 disabled:opacity-50"
                >
                  {busy === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkle className="h-3 w-3" />{REVEAL_COST}</>}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
