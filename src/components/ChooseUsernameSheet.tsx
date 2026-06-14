import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Sparkles, X } from 'lucide-react'
import { finalizeUsername } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { haptic } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Fiche modale : finalisation d'un compte invité. Pseudo OBLIGATOIRE
// (3-20 car., unique), nom affiché OPTIONNEL. Débloque publication
// et commentaires. Appelée depuis Compose et CommentsSheet.
// ─────────────────────────────────────────────────────────────
export function ChooseUsernameSheet({
  onClose,
  onDone,
  reason,
}: {
  onClose: () => void
  onDone: () => void
  reason?: string
}) {
  const setMe = useAuth((s) => s.setMe)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const valid = /^[a-z0-9_]{3,20}$/.test(username)

  async function submit() {
    if (!valid) {
      setErr('Pseudo : 3 à 20 caractères (a-z, 0-9, _).')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const p = await finalizeUsername(username, displayName)
      setMe(p)
      haptic([10, 20, 10])
      onDone()
    } catch (e) {
      setErr((e as Error)?.message || 'Échec. Réessaie.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-lg rounded-t-3xl p-6 pb-10"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold">
            <Sparkles className="h-5 w-5" />
            <span className="font-bold">Choisis ton pseudo</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          {reason || 'Un pseudo est requis pour publier et commenter. Le reste est optionnel.'}
        </p>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Pseudo <span className="text-flex-pink">*</span>
        </label>
        <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4">
          <span className="text-zinc-500">@</span>
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))
              setErr(null)
            }}
            placeholder="ton_pseudo"
            autoFocus
            className="w-full bg-transparent py-4 text-lg text-white outline-none placeholder:text-zinc-600"
          />
        </div>

        <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Nom affiché <span className="text-zinc-600">(optionnel)</span>
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
          placeholder="Ton nom public"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-600"
        />

        {err && <div className="mt-3 rounded-xl bg-flex-pink/10 px-3 py-2 text-sm text-flex-pink">{err}</div>}

        <button
          onClick={submit}
          disabled={!valid || busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-grad py-4 font-bold text-ink-900 transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continuer'}
        </button>
      </motion.div>
    </div>
  )
}
