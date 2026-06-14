import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ImagePlus, Loader2, Type, X } from 'lucide-react'
import { postStory } from '@/lib/stories'
import { processImage, trimVideo, uploadMedia } from '@/lib/upload'
import { useAuth } from '@/store/useAuth'
import { cn, haptic, sanitizeText } from '@/lib/utils'

const GRADS: Record<string, string> = {
  violet: 'from-flex-violet via-ink-700 to-flex-pink',
  cyan: 'from-flex-cyan via-ink-700 to-flex-violet',
  pink: 'from-flex-pink via-ink-700 to-gold',
}
const BGS = ['violet', 'cyan', 'pink']
const FILTERS: { label: string; css: string }[] = [
  { label: 'Aucun', css: '' },
  { label: 'Vif', css: 'saturate(1.4) contrast(1.08)' },
  { label: 'Clair', css: 'brightness(1.12) saturate(1.08)' },
  { label: 'N&B', css: 'grayscale(1) contrast(1.05)' },
  { label: 'Vintage', css: 'sepia(0.45) saturate(1.2) contrast(0.95)' },
  { label: 'Chaud', css: 'sepia(0.25) saturate(1.3) brightness(1.04)' },
]
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

type Mode = 'choose' | 'text' | 'editImage' | 'editVideo'

export function AddStatus({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const me = useAuth((s) => s.me)
  const [mode, setMode] = useState<Mode>('choose')
  const [text, setText] = useState('')
  const [bg, setBg] = useState('violet')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // édition média
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [filter, setFilter] = useState('')
  const [dur, setDur] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

  function pick(f: File | null) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setCaption('')
    setFilter('')
    setErr(null)
    setMode(f.type.startsWith('video') ? 'editVideo' : 'editImage')
  }

  async function publishImage() {
    if (!file || !me) return
    setBusy(true)
    setErr(null)
    try {
      const edited = await processImage(file, { filter, ratio: null })
      const url = await uploadMedia(edited, me.id)
      await postStory({ mediaUrl: url, kind: 'image', content: sanitizeText(caption.trim(), 200) || null })
      haptic([10, 20, 10])
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec.')
      setBusy(false)
    }
  }

  async function publishVideo() {
    if (!file || !me) return
    setBusy(true)
    setErr(null)
    try {
      const trimmed = await trimVideo(file, trimStart, trimEnd)
      const url = await uploadMedia(trimmed, me.id)
      await postStory({ mediaUrl: url, kind: 'video', content: sanitizeText(caption.trim(), 200) || null })
      haptic([10, 20, 10])
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec.')
      setBusy(false)
    }
  }

  async function postText() {
    const t = sanitizeText(text.trim(), 200)
    if (!t) return
    setBusy(true)
    try {
      await postStory({ kind: 'text', content: t, bg })
      haptic([10, 20, 10])
      onDone()
    } catch {
      setBusy(false)
    }
  }

  // ── Édition IMAGE ──
  if (mode === 'editImage') {
    return (
      <div className="fixed inset-0 z-[86] flex flex-col bg-ink-900">
        <div className="safe-top flex items-center justify-between px-4 py-2">
          <button onClick={() => setMode('choose')} className="text-zinc-300"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={publishImage} disabled={busy} className="rounded-full bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publier'}
          </button>
        </div>
        <div className="grid flex-1 place-items-center overflow-hidden bg-black">
          {preview && <img src={preview} alt="" style={{ filter }} className="max-h-full max-w-full object-contain" />}
        </div>
        {err && <div className="px-4 py-1 text-center text-sm text-flex-pink">{err}</div>}
        <div className="space-y-2 p-3">
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button key={f.label} onClick={() => { haptic(6); setFilter(f.css) }} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', filter === f.css ? 'bg-gold-grad text-ink-900' : 'border border-white/15 text-zinc-300')}>
                {f.label}
              </button>
            ))}
          </div>
          <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 200))} placeholder="Légende (optionnel)…" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-600" />
        </div>
      </div>
    )
  }

  // ── Édition VIDÉO (découpe) ──
  if (mode === 'editVideo') {
    return (
      <div className="fixed inset-0 z-[86] flex flex-col bg-ink-900">
        <div className="safe-top flex items-center justify-between px-4 py-2">
          <button onClick={() => setMode('choose')} className="text-zinc-300"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={publishVideo} disabled={busy} className="rounded-full bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publier'}
          </button>
        </div>
        <div className="grid flex-1 place-items-center overflow-hidden bg-black">
          {preview && (
            <video
              src={preview}
              controls
              playsInline
              className="max-h-full max-w-full object-contain"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration || 0
                setDur(d)
                setTrimEnd(d)
              }}
            />
          )}
        </div>
        {err && <div className="px-4 py-1 text-center text-sm text-flex-pink">{err}</div>}
        <div className="space-y-3 p-4">
          <div className="text-center text-xs text-zinc-400">
            Découpe : <span className="font-bold text-gold">{fmt(trimStart)} → {fmt(trimEnd)}</span> ({fmt(Math.max(0, trimEnd - trimStart))})
          </div>
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">Début</div>
            <input type="range" min={0} max={dur} step={0.1} value={trimStart} onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.3))} className="w-full accent-gold" />
          </div>
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">Fin</div>
            <input type="range" min={0} max={dur} step={0.1} value={trimEnd} onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.3))} className="w-full accent-gold" />
          </div>
          <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 200))} placeholder="Légende (optionnel)…" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-600" />
          <p className="text-center text-[11px] text-zinc-600">La découpe se fait à la publication (peut prendre quelques secondes).</p>
        </div>
      </div>
    )
  }

  // ── Texte ──
  if (mode === 'text') {
    return (
      <div className="fixed inset-0 z-[86] flex flex-col bg-ink-900">
        <div className="safe-top flex items-center justify-between px-4 py-2">
          <button onClick={() => setMode('choose')} className="text-zinc-300"><X className="h-6 w-6" /></button>
          <button onClick={postText} disabled={!text.trim() || busy} className="rounded-full bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publier'}
          </button>
        </div>
        <div className={cn('flex flex-1 items-center justify-center bg-gradient-to-br p-8', GRADS[bg])}>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} autoFocus placeholder="Écris ton statut…" rows={4} className="w-full resize-none bg-transparent text-center font-display text-2xl font-extrabold text-white outline-none placeholder:text-white/50" />
        </div>
        <div className="safe-bottom flex justify-center gap-3 py-4">
          {BGS.map((b) => (
            <button key={b} onClick={() => setBg(b)} className={cn('h-9 w-9 rounded-full bg-gradient-to-br', GRADS[b], bg === b && 'ring-2 ring-white')} />
          ))}
        </div>
      </div>
    )
  }

  // ── Choix ──
  return (
    <div className="fixed inset-0 z-[86] flex items-end bg-ink-900/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="glass w-full rounded-t-3xl p-5 pb-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold text-white">Nouveau statut</span>
          <button onClick={onClose} className="text-zinc-400"><X className="h-5 w-5" /></button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-white active:scale-[0.99]">
          <ImagePlus className="h-5 w-5 text-gold" />
          <span className="font-semibold">Photo / Vidéo</span>
        </button>
        <button onClick={() => setMode('text')} className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-white active:scale-[0.99]">
          <Type className="h-5 w-5 text-gold" />
          <span className="font-semibold">Texte</span>
        </button>
      </motion.div>
    </div>
  )
}
