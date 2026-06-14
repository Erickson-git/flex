import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ChevronLeft, ImagePlus, Loader2, Lock, Mic, Music2, Sparkles, Square, Type, Video, X } from 'lucide-react'
import { createFlex } from '@/lib/api'
import { processImage, splitVideo, uploadMedia } from '@/lib/upload'
import { isValidPin, pinHash } from '@/lib/pin'
import { useAuth } from '@/store/useAuth'
import { consumeSpotlightForPost } from '@/lib/orchestrator'
import { MEDIA } from '@/lib/media'
import { Avatar } from '@/components/Avatar'
import { SmartImage } from '@/components/SmartImage'
import { WaveBars } from '@/components/WaveBars'
import { CameraStudio } from '@/components/CameraStudio'
import { ChooseUsernameSheet } from '@/components/ChooseUsernameSheet'
import { TrackPicker } from '@/components/TrackPicker'
import { trackById } from '@/lib/audioLibrary'
import { cn, haptic, looksMalicious, sanitizeText } from '@/lib/utils'

type Mode = 'mood' | 'photo' | 'video' | 'audio' | 'visual'
const MAX = 280

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const MODES: { id: Mode; label: string; icon: typeof Type }[] = [
  { id: 'mood', label: 'Texte', icon: Type },
  { id: 'photo', label: 'Photo', icon: ImagePlus },
  { id: 'video', label: 'Vidéo', icon: Video },
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'visual', label: 'Visuel', icon: Sparkles },
]

const GRADIENTS: { id: string; className: string }[] = [
  { id: 'gradient:violet', className: 'from-flex-violet/80 via-ink-700 to-flex-pink/60' },
  { id: 'gradient:cyan', className: 'from-flex-cyan/70 via-ink-700 to-flex-violet/60' },
  { id: 'gradient:pink', className: 'from-flex-pink/70 via-ink-700 to-gold/50' },
]

const STOCK = [MEDIA.nightlife[2], MEDIA.luxury[2], MEDIA.neon[1], MEDIA.fashion[3], MEDIA.nightlife[3], MEDIA.luxury[0]]

const FILTERS: { label: string; css: string }[] = [
  { label: 'Aucun', css: '' },
  { label: 'Vif', css: 'saturate(1.4) contrast(1.08)' },
  { label: 'Clair', css: 'brightness(1.12) saturate(1.08)' },
  { label: 'N&B', css: 'grayscale(1) contrast(1.05)' },
  { label: 'Vintage', css: 'sepia(0.45) saturate(1.2) contrast(0.95)' },
  { label: 'Froid', css: 'hue-rotate(-12deg) saturate(1.1) brightness(1.03)' },
  { label: 'Chaud', css: 'sepia(0.25) saturate(1.3) brightness(1.04)' },
  { label: 'Drama', css: 'contrast(1.35) saturate(1.15) brightness(0.95)' },
]
const RATIOS: { label: string; value: number | null }[] = [
  { label: 'Original', value: null },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 0.8 },
  { label: '16:9', value: 16 / 9 },
]

export default function Compose() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('mood')
  const [content, setContent] = useState('')
  const [gradient, setGradient] = useState<string | null>(GRADIENTS[0].id)
  const [stock, setStock] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [images, setImages] = useState<File[]>([]) // photo : sélection multiple
  const [preview, setPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [needName, setNeedName] = useState(false)
  const [soundId, setSoundId] = useState<string | null>(null)
  const [showMusic, setShowMusic] = useState(false)
  const [filter, setFilter] = useState('')
  const [ratio, setRatio] = useState<number | null>(null)
  const [customSound, setCustomSound] = useState<{ url: string; name: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const soundFileRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recTimer = useRef<number | null>(null)

  useEffect(() => () => cleanupRec(), [])

  if (!me) return null

  function pickFile(f: File | null, kind: 'image' | 'audio' | 'video') {
    setError(null)
    if (!f) return
    setImages([])
    setFile(f)
    if (kind === 'audio') setPreview(f.name)
    else setPreview(URL.createObjectURL(f))
  }

  /** Sélection multiple depuis la galerie (1 Flex publié par image). */
  function pickImages(list: FileList | null) {
    setError(null)
    const arr = list ? Array.from(list).slice(0, 10) : []
    if (!arr.length) return
    setFile(null)
    setImages(arr)
    setPreview(URL.createObjectURL(arr[0]))
  }

  async function importSound(f: File | null) {
    if (!f || !me) return
    setError(null)
    try {
      const url = await uploadMedia(f, me.id)
      setCustomSound({ url, name: f.name })
      setSoundId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'import du son.")
    }
  }

  function resetMedia() {
    cleanupRec()
    setFile(null)
    setImages([])
    setPreview(null)
  }

  // ── Enregistrement de note vocale (MediaRecorder) ──
  function cleanupRec() {
    if (recTimer.current) {
      clearInterval(recTimer.current)
      recTimer.current = null
    }
    const mr = recRef.current
    if (mr) {
      mr.onstop = null
      try { if (mr.state !== 'inactive') mr.stop() } catch { /* ignore */ }
      mr.stream.getTracks().forEach((t) => t.stop())
      recRef.current = null
    }
    setRecording(false)
  }

  async function startRec() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      let secs = 0
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const type = mr.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'oga' : type.includes('mpeg') ? 'mp3' : 'weba'
        const f = new File([blob], `voice-${Date.now()}.${ext}`, { type })
        stream.getTracks().forEach((t) => t.stop())
        setImages([])
        setFile(f)
        setPreview(`Note vocale · ${fmt(secs)}`)
      }
      mr.start()
      recRef.current = mr
      setFile(null)
      setPreview(null)
      setRecSec(0)
      setRecording(true)
      recTimer.current = window.setInterval(() => {
        secs += 1
        setRecSec(secs)
      }, 1000)
    } catch {
      setError("Micro inaccessible — autorise l'accès au micro dans ton navigateur.")
    }
  }

  function stopRec() {
    if (recTimer.current) {
      clearInterval(recTimer.current)
      recTimer.current = null
    }
    try { recRef.current?.stop() } catch { /* ignore */ }
    recRef.current = null
    setRecording(false)
  }

  const photoCount = images.length || (file ? 1 : 0)
  const hasMedia = mode === 'mood' ? !!gradient : mode === 'visual' ? !!stock : mode === 'photo' ? photoCount > 0 : !!file
  const canPublish = (content.trim().length > 0 || hasMedia) && !posting

  async function publish() {
    if (!canPublish) return
    // Profil frais (gère le cas "invité vient de finaliser son pseudo").
    const cur = useAuth.getState().me
    if (!cur) return
    if (cur.is_guest) {
      setNeedName(true)
      return
    }
    const clean = sanitizeText(content.trim(), MAX)
    if (looksMalicious(content)) {
      setError('Contenu rejeté (sécurité).')
      return
    }
    setPosting(true)
    setError(null)
    haptic([10, 30, 10])
    try {
      if (locked && !isValidPin(pin)) {
        setError('Code PIN : 4 chiffres requis.')
        setPosting(false)
        return
      }
      const ph = locked ? await pinHash(pin, cur.id) : null
      const soundUrl = customSound?.url ?? trackById(soundId)?.url ?? null
      consumeSpotlightForPost()
      if (mode === 'mood') {
        await createFlex(clean, gradient, cur, ph, soundUrl)
      } else if (mode === 'visual') {
        await createFlex(clean, stock, cur, ph, soundUrl)
      } else if (mode === 'video' && file) {
        // Vidéo > 1 min → découpée en segments ≤ 1 min, joués à la chaîne.
        setProgress('Préparation de la vidéo…')
        const parts = await splitVideo(file, 60, (i, n) => setProgress(`Découpage de la vidéo… ${i}/${n}`))
        const urls: string[] = []
        for (let i = 0; i < parts.length; i++) {
          setProgress(parts.length > 1 ? `Envoi… ${i + 1}/${parts.length}` : 'Envoi de la vidéo…')
          urls.push(await uploadMedia(parts[i], cur.id))
        }
        setProgress(null)
        await createFlex(clean, urls[0] ?? null, cur, ph, null, urls.length > 1 ? urls : null)
      } else if (mode === 'audio' && file) {
        await createFlex(clean, await uploadMedia(file, cur.id), cur, ph)
      } else if (mode === 'photo') {
        // Multi-image : 1 Flex par photo (légende + musique sur la première).
        const imgs = images.length ? images : file ? [file] : []
        if (!imgs.length) {
          await createFlex(clean, null, cur, ph, soundUrl)
        } else {
          for (let i = 0; i < imgs.length; i++) {
            const edited = await processImage(imgs[i], { filter, ratio })
            const url = await uploadMedia(edited, cur.id)
            await createFlex(i === 0 ? clean : '', url, cur, ph, i === 0 ? soundUrl : null)
          }
        }
      } else {
        await createFlex(clean, null, cur, ph, soundUrl)
      }
      navigate('/app/flow', { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message
      setError(msg || 'Échec de la publication.')
      setProgress(null)
      setPosting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
      <header className="safe-top flex items-center justify-between px-4 pb-3 pt-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-semibold">Studio</span>
        <button
          onClick={publish}
          disabled={!canPublish}
          className="rounded-full bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 transition active:scale-95 disabled:opacity-30"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Flexer'}
        </button>
      </header>

      {/* Sélecteur de format */}
      <div className="flex gap-2 px-4 pb-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              haptic(8)
              setMode(m.id)
              resetMedia()
              setError(null)
            }}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2.5 text-xs font-semibold transition',
              mode === m.id
                ? 'border-gold/50 bg-gold/10 text-gold'
                : 'border-white/10 bg-white/[0.03] text-zinc-400',
            )}
          >
            <m.icon className="h-5 w-5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Zone de saisie texte (commune) */}
      <div className="flex gap-3 px-5 pt-3">
        <Avatar name={me.display_name} url={me.avatar_url} size={44} ring={me.tier === 'pioneer'} />
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          placeholder={mode === 'mood' ? 'Exprime ton mood ✦' : 'Ajoute une légende…'}
          rows={mode === 'mood' ? 3 : 2}
          className="flex-1 resize-none bg-transparent text-lg leading-relaxed text-white outline-none placeholder:text-zinc-600"
        />
      </div>

      {/* Aperçu selon le mode */}
      <div className="px-5">
        {mode === 'mood' && gradient && (
          <div className={cn('mt-2 grid aspect-[4/3] place-items-center rounded-2xl bg-gradient-to-br p-6 text-center', GRADIENTS.find((g) => g.id === gradient)?.className)}>
            <span className="font-display text-2xl font-extrabold text-white drop-shadow">{content || 'Ton mood ici'}</span>
          </div>
        )}
        {mode === 'photo' && preview && (
          <div className="mt-2">
            <div className="relative">
              <img
                src={preview}
                alt="aperçu"
                style={{ filter }}
                className={cn('w-full rounded-2xl object-cover', ratio === 1 ? 'aspect-square' : ratio && ratio > 1.5 ? 'aspect-video' : 'aspect-[4/5]')}
              />
              {photoCount > 1 && (
                <span className="absolute left-2 top-2 rounded-full bg-ink-900/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                  {photoCount} photos
                </span>
              )}
              <RemoveBtn onClick={resetMedia} />
            </div>
            {/* Filtres */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button key={f.label} onClick={() => { haptic(6); setFilter(f.css) }} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition', filter === f.css ? 'bg-gold-grad text-ink-900' : 'border border-white/15 text-zinc-300')}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Recadrer */}
            <div className="mt-2 flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-xs text-zinc-500">Recadrer</span>
              {RATIOS.map((r) => (
                <button key={r.label} onClick={() => { haptic(6); setRatio(r.value) }} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition', ratio === r.value ? 'bg-flex-cyan/25 text-flex-cyan' : 'border border-white/15 text-zinc-300')}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === 'video' && preview && file && (
          <div className="relative mt-2">
            <video src={preview} controls playsInline className="aspect-[4/5] w-full rounded-2xl bg-black object-contain" />
            <RemoveBtn onClick={resetMedia} />
          </div>
        )}
        {mode === 'audio' && recording && (
          <div className="mt-2 rounded-2xl border border-flex-pink/30 bg-flex-pink/[0.06] p-5">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-flex-pink" />
              <span className="font-semibold text-white">Enregistrement… {fmt(recSec)}</span>
            </div>
            <div className="mt-3"><WaveBars playing /></div>
          </div>
        )}
        {mode === 'audio' && !recording && file && (
          <div className="relative mt-2 rounded-2xl border border-white/10 bg-ink-800/60 p-5">
            <WaveBars playing />
            <div className="mt-3 truncate text-sm text-zinc-400">{preview}</div>
            <RemoveBtn onClick={resetMedia} />
          </div>
        )}
      </div>

      {/* Contrôles selon le mode */}
      <div className="mt-auto px-5 pb-8 pt-4">
        {error && <div className="mb-3 rounded-xl bg-flex-pink/10 px-3 py-2 text-sm text-flex-pink">{error}</div>}
        {progress && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-gold/10 px-3 py-2 text-sm text-gold">
            <Loader2 className="h-4 w-4 animate-spin" /> {progress}
          </div>
        )}

        {mode === 'mood' && (
          <>
            <div className="mb-3 text-sm text-zinc-500">Choisis ton ambiance</div>
            <div className="flex gap-3">
              {GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { haptic(8); setGradient(g.id) }}
                  className={cn('h-14 flex-1 rounded-xl bg-gradient-to-br ring-2 transition', g.className, gradient === g.id ? 'ring-gold' : 'ring-transparent')}
                />
              ))}
            </div>
          </>
        )}

        {mode === 'photo' && (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
            <div className="flex gap-2">
              <button onClick={() => setShowCamera(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-grad py-4 font-bold text-ink-900 active:scale-[0.98]">
                <Camera className="h-5 w-5" /> Caméra + filtres
              </button>
              <button onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] py-4 font-semibold text-zinc-200 active:scale-[0.98]">
                <ImagePlus className="h-5 w-5" /> Galerie
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-600">Galerie = sélection multiple (1 Flex par photo). Compression auto.</p>
          </>
        )}

        {mode === 'video' && (
          <>
            <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null, 'video')} />
            <button onClick={() => videoRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] py-4 font-semibold text-zinc-200 active:scale-[0.98]">
              <Video className="h-5 w-5" /> {file ? 'Changer la vidéo' : 'Importer une vidéo'}
            </button>
            <p className="mt-2 text-center text-xs text-zinc-600">Max 50 Mo. Les vidéos de plus d'1 min sont automatiquement découpées en parties ≤ 1 min, jouées à la chaîne.</p>
          </>
        )}

        {mode === 'audio' && (
          <>
            <input ref={audioRef} type="file" accept="audio/*" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null, 'audio')} />
            {recording ? (
              <button onClick={stopRec} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-flex-pink py-4 font-bold text-white active:scale-[0.98]">
                <Square className="h-5 w-5" /> Arrêter · {fmt(recSec)}
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={startRec} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-grad py-4 font-bold text-ink-900 active:scale-[0.98]">
                  <Mic className="h-5 w-5" /> {file ? 'Réenregistrer' : 'Enregistrer'}
                </button>
                <button onClick={() => audioRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] py-4 font-semibold text-zinc-200 active:scale-[0.98]">
                  <ImagePlus className="h-5 w-5" /> Importer
                </button>
              </div>
            )}
            <p className="mt-2 text-center text-xs text-zinc-600">Enregistre une note vocale ou importe un audio. Max 15 Mo.</p>
          </>
        )}

        {mode === 'visual' && (
          <>
            <div className="mb-3 text-sm text-zinc-500">Choisis un visuel</div>
            <div className="grid grid-cols-3 gap-2">
              {STOCK.map((p) => (
                <button key={p} onClick={() => { haptic(8); setStock(stock === p ? null : p) }} className={cn('relative aspect-square overflow-hidden rounded-xl ring-2 transition', stock === p ? 'ring-gold' : 'ring-transparent')}>
                  <SmartImage src={p} seed={p.length} className="h-full w-full" overlay={false} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Musique de fond (mood / photo / visuel) */}
        {(mode === 'mood' || mode === 'photo' || mode === 'visual') && (
          <>
            <button
              onClick={() => { haptic(8); setShowMusic(true) }}
              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4 text-gold" />
                <div>
                  <div className="truncate font-semibold text-white">
                    {customSound ? customSound.name : soundId ? trackById(soundId)?.title : 'Ajouter une musique'}
                  </div>
                  <div className="text-xs text-zinc-500">Une bande-son qui joue sur ton Flex.</div>
                </div>
              </div>
              {(soundId || customSound) && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); setSoundId(null); setCustomSound(null) }}
                  className="shrink-0 text-xs font-semibold text-flex-pink"
                >
                  Retirer
                </span>
              )}
            </button>
            <input ref={soundFileRef} type="file" accept="audio/*" hidden onChange={(e) => importSound(e.target.files?.[0] ?? null)} />
            <button onClick={() => soundFileRef.current?.click()} className="mt-1.5 text-xs font-semibold text-zinc-500 underline">
              Ou importer un son depuis l'appareil
            </button>
          </>
        )}

        {/* Verrou par code PIN (FLEX Lite) */}
        <button
          onClick={() => { haptic(8); setLocked((v) => !v) }}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gold" />
            <div>
              <div className="font-semibold text-white">Verrouiller (code PIN)</div>
              <div className="text-xs text-zinc-500">Seuls ceux qui ont le code verront ce Flex.</div>
            </div>
          </div>
          <span className={cn('relative h-6 w-11 rounded-full transition', locked ? 'bg-gold' : 'bg-white/15')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', locked ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>
        {locked && (
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="• • • •"
            className="mt-2 w-full rounded-xl border border-gold/40 bg-white/[0.04] py-3 text-center text-2xl tracking-[0.6em] text-white outline-none placeholder:text-zinc-700"
          />
        )}

        <div className={cn('mt-3 text-right text-xs', content.length > MAX - 30 ? 'text-flex-pink' : 'text-zinc-600')}>{content.length}/{MAX}</div>
      </div>

      {showCamera && (
        <CameraStudio
          onClose={() => setShowCamera(false)}
          onCapture={(f) => {
            pickFile(f, 'image')
            setShowCamera(false)
          }}
        />
      )}

      {needName && (
        <ChooseUsernameSheet
          reason="Choisis ton pseudo pour publier ton premier Flex (le reste est optionnel)."
          onClose={() => setNeedName(false)}
          onDone={() => {
            setNeedName(false)
            publish()
          }}
        />
      )}

      {showMusic && (
        <TrackPicker
          selectedId={soundId}
          onSelect={(t) => { setSoundId(t?.id ?? null); setShowMusic(false) }}
          onClose={() => setShowMusic(false)}
        />
      )}
    </div>
  )
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-900/70 text-white backdrop-blur active:scale-90">
      <X className="h-4 w-4" />
    </button>
  )
}
