import { useEffect, useState, type ReactNode } from 'react'
import { Check, Loader2, Lock, Pencil, Play, Trash2, Unlock, X } from 'lucide-react'
import type { Flex } from '@/lib/types'
import { deleteFlex, fetchUserFlexes, setFlexPin, updateFlexContent } from '@/lib/api'
import { pinHash } from '@/lib/pin'
import { isAudioUrl, isVideoUrl } from '@/lib/upload'
import { cn, haptic, looksMalicious, sanitizeText, timeAgo } from '@/lib/utils'

const MAX = 280

const GRADS: Record<string, string> = {
  'gradient:violet': 'from-flex-violet/80 via-ink-700 to-flex-pink/60',
  'gradient:cyan': 'from-flex-cyan/70 via-ink-700 to-flex-violet/60',
  'gradient:pink': 'from-flex-pink/70 via-ink-700 to-gold/50',
}

// ─────────────────────────────────────────────────────────────
// Historique des Flex d'un profil. Pour le propriétaire : chaque
// Flex peut être modifié, verrouillé/déverrouillé (code PIN) ou
// supprimé (RLS : auth.uid() = author_id).
// ─────────────────────────────────────────────────────────────
export function ProfileFlexHistory({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [flexes, setFlexes] = useState<Flex[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchUserFlexes(userId)
      .then((f) => active && setFlexes(f))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [userId])

  const patch = (id: string, p: Partial<Flex>) =>
    setFlexes((list) => list.map((f) => (f.id === id ? { ...f, ...p } : f)))
  const remove = (id: string) => setFlexes((list) => list.filter((f) => f.id !== id))

  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Historique</h2>
        {!loading && <span className="text-xs text-zinc-600">{flexes.length}</span>}
      </div>
      {loading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : flexes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-ink-800/40 py-8 text-center text-sm text-zinc-500">
          Aucun Flex pour l'instant.
        </div>
      ) : (
        <div className="space-y-3">
          {flexes.map((f) => (
            <HistoryRow key={f.id} flex={f} userId={userId} isOwner={isOwner} onPatch={patch} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryRow({
  flex,
  userId,
  isOwner,
  onPatch,
  onRemove,
}: {
  flex: Flex
  userId: string
  isOwner: boolean
  onPatch: (id: string, p: Partial<Flex>) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(flex.content)
  const [locking, setLocking] = useState(false)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState(false)
  const isLockedPost = !!flex.pin_hash
  // Visiteur sans le code : contenu flouté + saisie du code.
  const hidden = !isOwner && isLockedPost && !unlocked

  async function tryReveal() {
    if (!/^\d{4}$/.test(code)) return
    const h = await pinHash(code, flex.author_id)
    if (h === flex.pin_hash) {
      setUnlocked(true)
      setCodeErr(false)
    } else {
      setCodeErr(true)
    }
  }

  async function saveEdit() {
    if (looksMalicious(draft)) {
      setErr('Contenu rejeté (sécurité).')
      return
    }
    const clean = sanitizeText(draft.trim(), MAX)
    setBusy(true)
    setErr(null)
    try {
      await updateFlexContent(flex.id, clean)
      onPatch(flex.id, { content: clean })
      setEditing(false)
    } catch (e) {
      setErr((e as Error)?.message || 'Échec de la modification.')
    } finally {
      setBusy(false)
    }
  }

  async function applyLock() {
    if (!/^\d{4}$/.test(pin)) {
      setErr('Code PIN : 4 chiffres.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const h = await pinHash(pin, userId)
      await setFlexPin(flex.id, h)
      onPatch(flex.id, { pin_hash: h })
      setLocking(false)
      setPin('')
    } catch (e) {
      setErr((e as Error)?.message || 'Échec.')
    } finally {
      setBusy(false)
    }
  }

  async function unlock() {
    setBusy(true)
    setErr(null)
    try {
      await setFlexPin(flex.id, null)
      onPatch(flex.id, { pin_hash: null })
    } catch (e) {
      setErr((e as Error)?.message || 'Échec.')
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    if (!window.confirm('Supprimer ce Flex définitivement ?')) return
    setBusy(true)
    setErr(null)
    try {
      await deleteFlex(flex.id)
      onRemove(flex.id)
    } catch (e) {
      setErr((e as Error)?.message || 'Échec de la suppression.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex gap-3">
        <Thumb flex={flex} blurred={hidden} />
        <div className="min-w-0 flex-1">
          {hidden ? (
            <div>
              <p className="flex items-center gap-1 text-sm font-semibold text-gold">
                <Lock className="h-3.5 w-3.5" /> Flex verrouillé
              </p>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodeErr(false) }}
                  onKeyDown={(e) => e.key === 'Enter' && tryReveal()}
                  inputMode="numeric"
                  placeholder="• • • •"
                  className="w-24 rounded-lg border border-gold/40 bg-white/[0.04] py-1.5 text-center text-sm tracking-[0.3em] text-white outline-none placeholder:text-zinc-700"
                />
                <button onClick={tryReveal} className="rounded-lg bg-gold-grad px-3 text-xs font-bold text-ink-900 active:scale-95">
                  Voir
                </button>
              </div>
              {codeErr && <div className="mt-1 text-xs text-flex-pink">Code incorrect.</div>}
            </div>
          ) : editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-xl border border-gold/40 bg-white/[0.04] p-2 text-sm text-white outline-none"
            />
          ) : (
            <p className="line-clamp-3 text-sm text-zinc-200">
              {flex.content || <span className="text-zinc-600">(sans texte)</span>}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
            {timeAgo(flex.created_at)}
            {isLockedPost && (
              <span className="inline-flex items-center gap-1 text-gold">
                <Lock className="h-3 w-3" /> verrouillé
              </span>
            )}
          </div>
        </div>
      </div>

      {err && <div className="mt-2 text-xs text-flex-pink">{err}</div>}

      {locking && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="• • • •"
            autoFocus
            className="w-28 rounded-xl border border-gold/40 bg-white/[0.04] py-2 text-center tracking-[0.4em] text-white outline-none placeholder:text-zinc-700"
          />
          <button onClick={applyLock} disabled={busy} className="flex items-center gap-1 rounded-xl bg-gold-grad px-4 py-2 text-xs font-bold text-ink-900 active:scale-95 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verrouiller'}
          </button>
          <button onClick={() => { setLocking(false); setPin(''); setErr(null) }} className="rounded-xl border border-white/15 px-3 py-2 text-xs text-zinc-300">
            Annuler
          </button>
        </div>
      )}

      {isOwner && !locking && (
        <div className="mt-2 flex flex-wrap gap-2">
          {editing ? (
            <>
              <ActBtn onClick={saveEdit} busy={busy} icon={Check} label="Enregistrer" primary />
              <ActBtn onClick={() => { setEditing(false); setDraft(flex.content); setErr(null) }} icon={X} label="Annuler" />
            </>
          ) : (
            <>
              <ActBtn onClick={() => { haptic(8); setEditing(true) }} icon={Pencil} label="Modifier" />
              {isLockedPost ? (
                <ActBtn onClick={unlock} busy={busy} icon={Unlock} label="Déverrouiller" />
              ) : (
                <ActBtn onClick={() => { haptic(8); setLocking(true) }} icon={Lock} label="Verrouiller" />
              )}
              <ActBtn onClick={del} busy={busy} icon={Trash2} label="Supprimer" danger />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Thumb({ flex, blurred }: { flex: Flex; blurred?: boolean }) {
  const m = flex.media_url
  let inner: ReactNode
  if (!m || m.startsWith('gradient:')) {
    inner = <div className={cn('h-16 w-16 rounded-xl bg-gradient-to-br', GRADS[m ?? ''] ?? 'from-ink-600 to-ink-700')} />
  } else if (isVideoUrl(m)) {
    inner = (
      <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-black">
        <video src={m} muted preload="metadata" className="h-full w-full object-cover" />
        <Play className="absolute inset-0 m-auto h-5 w-5 text-white/90" />
      </div>
    )
  } else if (isAudioUrl(m)) {
    inner = <div className="grid h-16 w-16 place-items-center rounded-xl bg-ink-700 text-2xl">🎵</div>
  } else {
    inner = <img src={m} alt="" className="h-16 w-16 rounded-xl object-cover" />
  }

  if (blurred) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <div className="h-full w-full scale-110 blur-md">{inner}</div>
        <div className="absolute inset-0 grid place-items-center bg-ink-900/40">
          <Lock className="h-5 w-5 text-gold" />
        </div>
      </div>
    )
  }
  return <div className="shrink-0">{inner}</div>
}

function ActBtn({
  onClick,
  icon: Icon,
  label,
  busy,
  primary,
  danger,
}: {
  onClick: () => void
  icon: typeof Pencil
  label: string
  busy?: boolean
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50',
        primary ? 'bg-gold-grad text-ink-900' : danger ? 'border border-flex-pink/30 text-flex-pink' : 'border border-white/15 text-zinc-200',
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}
