import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Download, Film, Image as ImageIcon, Lock, Music2, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import {
  downloadMedia,
  fetchGallery,
  galleryPinSet,
  removeFromGallery,
  setGalleryPin,
  verifyGalleryPin,
  type SavedMedia,
} from '@/lib/gallery'
import { haptic } from '@/lib/utils'

type Phase = 'unlock' | 'create' | 'open'

/**
 * Galerie PRIVÉE de l'utilisateur, verrouillée par un code PIN à 4 chiffres.
 * Tout ce qui a été « enregistré » (publications, médias reçus, appels) est ici.
 */
export default function Gallery() {
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const [phase, setPhase] = useState<Phase>(galleryPinSet() ? 'unlock' : 'create')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [items, setItems] = useState<SavedMedia[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all')

  const salt = me?.id ?? 'anon'
  const shown = filter === 'all' ? items : items.filter((m) => m.kind === filter)
  const FILTERS = [
    { key: 'all' as const, label: 'Tout' },
    { key: 'image' as const, label: 'Photos' },
    { key: 'video' as const, label: 'Vidéos' },
    { key: 'audio' as const, label: 'Audio' },
  ]

  async function load() {
    setLoading(true)
    setItems(await fetchGallery())
    setLoading(false)
  }

  useEffect(() => {
    if (phase === 'open') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  async function unlock() {
    if (!/^\d{4}$/.test(pin)) return
    if (await verifyGalleryPin(pin, salt)) {
      haptic([10, 30, 10])
      setErr(null)
      setPin('')
      setPhase('open')
    } else {
      setErr('Code incorrect.')
    }
  }

  async function create() {
    if (!/^\d{4}$/.test(pin)) return setErr('4 chiffres requis.')
    if (pin !== pin2) return setErr('Les deux codes ne correspondent pas.')
    await setGalleryPin(pin, salt)
    haptic([10, 30, 10])
    setErr(null)
    setPin('')
    setPin2('')
    setPhase('open')
  }

  async function del(id: string) {
    setItems((l) => l.filter((m) => m.id !== id))
    await removeFromGallery(id)
  }

  // ── Écrans de verrouillage ────────────────────────────────────────
  if (phase !== 'open') {
    const creating = phase === 'create'
    return (
      <div className="relative flex min-h-[100dvh] flex-col px-6 pt-6">
        <button onClick={() => navigate(-1)} className="w-fit rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="mx-auto mt-16 w-full max-w-xs text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold/10">
            <Lock className="h-8 w-8 text-gold" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold">Galerie privée</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {creating
              ? 'Crée un code à 4 chiffres pour protéger ta galerie.'
              : 'Entre ton code à 4 chiffres pour déverrouiller.'}
          </p>

          <input
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr(null) }}
            onKeyDown={(e) => e.key === 'Enter' && (creating ? create() : unlock())}
            inputMode="numeric"
            autoFocus
            placeholder="• • • •"
            className="mx-auto mt-6 block w-44 rounded-xl border border-gold/40 bg-white/[0.04] py-3 text-center text-2xl tracking-[0.5em] text-white outline-none placeholder:text-zinc-700"
          />
          {creating && (
            <input
              value={pin2}
              onChange={(e) => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr(null) }}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              inputMode="numeric"
              placeholder="Confirme le code"
              className="mx-auto mt-3 block w-44 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-center text-2xl tracking-[0.5em] text-white outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-zinc-700"
            />
          )}
          {err && <p className="mt-2 text-sm text-flex-pink">{err}</p>}

          <button
            onClick={creating ? create : unlock}
            className="mt-6 w-full rounded-2xl bg-gold-grad py-3 text-sm font-bold text-ink-900 active:scale-[0.98]"
          >
            {creating ? 'Créer le code' : 'Déverrouiller'}
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Le code n'est jamais stocké en clair.
          </p>
        </div>
      </div>
    )
  }

  // ── Galerie déverrouillée ─────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-extrabold leading-tight">Ma galerie privée</h1>
          <p className="text-xs text-zinc-500">{items.length} élément{items.length > 1 ? 's' : ''} · chiffré par code</p>
        </div>
        <button onClick={() => setPhase('unlock')} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-zinc-400" aria-label="Verrouiller">
          <Lock className="h-5 w-5" />
        </button>
      </header>

      {/* Filtres par type */}
      {items.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition ' +
                (filter === f.key ? 'bg-gold-grad text-ink-900' : 'border border-white/10 text-zinc-400')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-600">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.04]">
            <ImageIcon className="h-7 w-7 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400">Ta galerie est vide.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Touche <Download className="inline h-3.5 w-3.5" /> sur une publication ou un média reçu pour le ranger ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {shown.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60 shadow-card"
            >
              {m.kind === 'video' ? (
                <video src={m.url} playsInline muted preload="metadata" className="h-full w-full bg-black object-cover" />
              ) : m.kind === 'audio' ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-flex-violet/30 to-flex-pink/20 p-3">
                  <Music2 className="h-8 w-8 text-white/90" />
                  <audio src={m.url} controls preload="none" className="w-full" />
                </div>
              ) : (
                <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-active:scale-105" />
              )}

              {/* Pastille de type */}
              {m.kind !== 'image' && (
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
                  {m.kind === 'video' ? <Film className="h-3.5 w-3.5" /> : <Music2 className="h-3.5 w-3.5" />}
                </span>
              )}

              {/* Actions + source */}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-2 pt-6">
                <span className="min-w-0 truncate text-[10px] font-medium text-zinc-200">{m.source ?? ''}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => downloadMedia(m.url)}
                    aria-label="Télécharger"
                    className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur active:scale-90"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    aria-label="Supprimer"
                    className="grid h-8 w-8 place-items-center rounded-full bg-flex-pink/85 text-white active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {shown.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-zinc-600">Rien dans cette catégorie.</p>
          )}
        </div>
      )}
    </div>
  )
}
