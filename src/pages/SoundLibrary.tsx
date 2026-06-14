import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, ChevronLeft, Music2, Pause, Play, SkipBack, SkipForward, Sparkles } from 'lucide-react'
import { TRACKS, getRingtoneId, setRingtoneId, type Track } from '@/lib/audioLibrary'
import { updateMyProfile } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { cn, haptic } from '@/lib/utils'

export default function SoundLibrary() {
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const setMe = useAuth((s) => s.setMe)
  const [idx, setIdx] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ringtone, setRing] = useState(getRingtoneId())
  const [vibeId, setVibeId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function ensureAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.onended = () => next()
    }
    return audioRef.current
  }

  function playAt(i: number) {
    const a = ensureAudio()
    if (idx === i && playing) {
      a.pause()
      setPlaying(false)
      return
    }
    a.src = TRACKS[i].url
    a.play().then(() => {
      setIdx(i)
      setPlaying(true)
    }).catch(() => {})
  }

  function toggle() {
    if (idx === null) return playAt(0)
    const a = ensureAudio()
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  function next() {
    setIdx((cur) => {
      const i = cur === null ? 0 : (cur + 1) % TRACKS.length
      const a = ensureAudio()
      a.src = TRACKS[i].url
      a.play().then(() => setPlaying(true)).catch(() => {})
      return i
    })
  }
  function prev() {
    if (idx === null) return playAt(0)
    playAt((idx - 1 + TRACKS.length) % TRACKS.length)
  }

  function flash(m: string) {
    setToast(m)
    window.setTimeout(() => setToast(null), 1800)
  }

  function chooseRingtone(t: Track) {
    haptic([10, 20, 10])
    setRingtoneId(t.id)
    setRing(t.id)
    flash(`Sonnerie : ${t.title}`)
  }

  async function setVibe(t: Track) {
    if (!me) return
    haptic([10, 20, 10])
    setVibeId(t.id)
    flash(`Ta vibe : ${t.title}`)
    try {
      const updated = await updateMyProfile(me, { music_url: t.url })
      setMe(updated)
    } catch {
      flash('Échec — réessaie.')
    }
  }

  const current = idx !== null ? TRACKS[idx] : null

  return (
    <div className="mx-auto max-w-lg pb-36">
      <header className="safe-top flex items-center gap-3 px-4 pb-3 pt-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <Music2 className="h-5 w-5 text-gold" /> Sons FLEX
          </h1>
          <p className="text-xs text-zinc-500">{TRACKS.length} titres · écoute, sonnerie, ta vibe</p>
        </div>
      </header>

      <div className="space-y-2 px-3">
        {TRACKS.map((t, i) => {
          const isCur = idx === i
          return (
            <div
              key={t.id}
              className={cn('flex items-center gap-3 rounded-2xl border px-3 py-2.5', isCur ? 'border-gold/40 bg-gold/[0.07]' : 'border-white/8 bg-white/[0.02]')}
            >
              <button
                onClick={() => playAt(i)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 active:scale-90"
              >
                {isCur && playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{t.title}</div>
                <div className="mt-1 flex gap-3">
                  <button
                    onClick={() => chooseRingtone(t)}
                    className={cn('flex items-center gap-1 text-xs font-semibold', ringtone === t.id ? 'text-emerald-300' : 'text-zinc-400')}
                  >
                    {ringtone === t.id ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    Sonnerie
                  </button>
                  <button
                    onClick={() => setVibe(t)}
                    className={cn('flex items-center gap-1 text-xs font-semibold', vibeId === t.id ? 'text-flex-violet' : 'text-zinc-400')}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Ma vibe
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink-700 px-4 py-2 text-sm font-semibold text-white shadow-card">
          {toast}
        </div>
      )}

      {/* Mini-lecteur persistant */}
      {current && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg border-t border-white/10 bg-ink-800/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{current.title}</div>
              <div className="text-xs text-zinc-500">{playing ? 'Lecture…' : 'En pause'}</div>
            </div>
            <button onClick={prev} className="text-zinc-300 active:scale-90"><SkipBack className="h-6 w-6" /></button>
            <button onClick={toggle} className="grid h-12 w-12 place-items-center rounded-full bg-gold-grad text-ink-900 active:scale-90">
              {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            <button onClick={next} className="text-zinc-300 active:scale-90"><SkipForward className="h-6 w-6" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
