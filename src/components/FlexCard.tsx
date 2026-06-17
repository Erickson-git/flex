import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Download, Languages, Lock, MessageCircle, Music2, Pause, Play, Share2, TrendingUp } from 'lucide-react'
import type { Flex } from '@/lib/types'
import { compact, haptic, timeAgo } from '@/lib/utils'
import { recordView, shareFlex, toggleFlexLike } from '@/lib/api'
import { recordNotification } from '@/lib/notifications'
import { useAuth } from '@/store/useAuth'
import { translateText } from '@/lib/translate'
import { recordEngagement } from '@/lib/engagement'
import { saveAndDownload } from '@/lib/gallery'
import { toastOk } from '@/lib/toast'
import { pinHash } from '@/lib/pin'
import { isAudioUrl, isVideoUrl } from '@/lib/upload'
import { trackByUrl } from '@/lib/audioLibrary'
import { useDwell } from '@/hooks/useDwell'
import { WaveBars } from './WaveBars'
import { Avatar } from './Avatar'
import { PioneerBadge } from './PioneerBadge'
import { PrestigeBadge } from './PrestigeBadge'
import { FlexReaction } from './FlexReaction'
import { SmartImage } from './SmartImage'
import { ReportButton } from './ReportButton'
import { CommentsSheet } from './CommentsSheet'

const GRADS: Record<string, string> = {
  'gradient:violet': 'from-flex-violet/80 via-ink-700 to-flex-pink/60',
  'gradient:cyan': 'from-flex-cyan/70 via-ink-700 to-flex-violet/60',
  'gradient:pink': 'from-flex-pink/70 via-ink-700 to-gold/50',
}

export function FlexCard({ flex, index = 0 }: { flex: Flex; index?: number }) {
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const [liked, setLiked] = useState(!!flex.liked_by_me)
  const [count, setCount] = useState(flex.likes_count)
  const [shares, setShares] = useState(flex.shares_count ?? 0)
  const [translated, setTranslated] = useState<string | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(flex.comments_count)
  const [saved, setSaved] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pinTry, setPinTry] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const dwellRef = useDwell((ms) => {
    recordView(flex.id, ms)
    recordEngagement(flex, 'dwell', ms / 1000) // apprend l'attention réelle
  })
  const [musicPlaying, setMusicPlaying] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const track = trackByUrl(flex.sound_url)

  useEffect(() => () => { musicRef.current?.pause() }, [])

  function toggleMusic() {
    if (!flex.sound_url) return
    if (!musicRef.current) {
      musicRef.current = new Audio(flex.sound_url)
      musicRef.current.loop = true
      musicRef.current.onended = () => setMusicPlaying(false)
    }
    if (musicPlaying) {
      musicRef.current.pause()
      setMusicPlaying(false)
    } else {
      musicRef.current.play().then(() => setMusicPlaying(true)).catch(() => {})
    }
  }

  const isLocked = !!flex.pin_hash && !unlocked

  async function tryUnlock() {
    if (!/^\d{4}$/.test(pinTry)) return
    const h = await pinHash(pinTry, flex.author_id)
    if (h === flex.pin_hash) {
      setUnlocked(true)
      setPinErr(false)
    } else {
      setPinErr(true)
    }
  }

  async function onTranslate() {
    if (translated) {
      setShowTranslation((v) => !v)
      return
    }
    setTranslating(true)
    try {
      setTranslated(await translateText(flex.content))
      setShowTranslation(true)
    } catch {
      /* silencieux : on garde l'original affiché */
    } finally {
      setTranslating(false)
    }
  }

  async function onShare() {
    haptic(12)
    setShares((s) => s + 1)
    recordEngagement(flex, 'share')
    const url = `${location.origin}/?p=${flex.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'FLEX', text: flex.content || 'Regarde ce Flex ✦', url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* annulé */
    }
    shareFlex(flex.id).catch(() => {})
  }

  // Télécharge la publication ET la range dans la galerie privée.
  async function onSave() {
    if (!flex.media_url || flex.media_url.startsWith('gradient:')) return
    haptic(12)
    setSaved(true)
    try {
      await saveAndDownload(flex.media_url, author ? `Publication de @${author.username}` : 'Publication')
      toastOk('Enregistré dans ta galerie ✓')
    } catch {
      /* ignore */
    }
  }

  // "Starification" : un post boosté reçoit des Flex en direct (le compteur grimpe).
  useEffect(() => {
    if (!flex.boosted) return
    let added = 0
    const max = 30 + (flex.id.length % 40)
    const t = setInterval(() => {
      if (added >= max) return clearInterval(t)
      const step = 1 + Math.floor(Math.random() * 4)
      added += step
      setCount((c) => c + step)
    }, 1500)
    return () => clearInterval(t)
  }, [flex.boosted, flex.id])

  async function onToggle() {
    const next = !liked
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    if (next) recordEngagement(flex, 'like')
    try {
      await toggleFlexLike(flex.id, liked)
      if (next && me && flex.author_id !== me.id) {
        recordNotification(flex.author_id, 'like', `${me.display_name} a aimé ton Flex ✦`, undefined, {
          image: me.avatar_url,
          actorId: me.id,
          actorName: me.display_name,
        })
      }
    } catch {
      // Annule uniquement le delta (ne pas écraser un compteur boosté).
      setLiked(liked)
      setCount((c) => c - (next ? 1 : -1))
    }
  }

  const author = flex.author
  const isGrad = flex.media_url?.startsWith('gradient:')
  const isAudio = isAudioUrl(flex.media_url)
  const isVideo = isVideoUrl(flex.media_url)
  // Vidéo longue découpée → suite de segments joués à la chaîne.
  const chain = !isGrad && flex.media_urls && flex.media_urls.length > 1 ? flex.media_urls : null

  return (
    <motion.article
      ref={dwellRef}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: 'easeOut' }}
      className="glass overflow-hidden rounded-3xl shadow-card"
    >
      <div
        className="flex items-center gap-3 p-4"
        onClick={() => { if (author) { recordEngagement(flex, 'profile'); navigate(`/app/u/${author.username}`) } }}
        role="button"
      >
        <Avatar name={author?.display_name ?? '?'} url={author?.avatar_url} ring={author?.tier === 'pioneer'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-white">{author?.display_name}</span>
            {author && <PrestigeBadge score={author.flex_score} size="sm" />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            @{author?.username} · {timeAgo(flex.created_at)}
            {author && <PioneerBadge tier={author.tier} rank={author.joined_rank} size="sm" />}
          </div>
        </div>
        {flex.boosted && (
          <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
            <TrendingUp className="h-3 w-3" /> BOOST
          </span>
        )}
      </div>

      {isLocked && (
        <div className="mx-4 mb-3 rounded-2xl border border-gold/30 bg-gold/[0.05] p-5 text-center">
          <Lock className="mx-auto mb-2 h-7 w-7 text-gold" />
          <div className="font-semibold text-white">Flex verrouillé</div>
          <p className="mt-1 text-xs text-zinc-500">Entre le code à 4 chiffres pour le voir.</p>
          <input
            value={pinTry}
            onChange={(e) => { setPinTry(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinErr(false) }}
            onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
            inputMode="numeric"
            placeholder="• • • •"
            className="mx-auto mt-3 block w-40 rounded-xl border border-gold/40 bg-white/[0.04] py-2.5 text-center text-xl tracking-[0.5em] text-white outline-none placeholder:text-zinc-700"
          />
          {pinErr && <div className="mt-1 text-xs text-flex-pink">Code incorrect.</div>}
          <button onClick={tryUnlock} className="mt-3 rounded-xl bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 active:scale-95">
            Déverrouiller
          </button>
        </div>
      )}

      {!isLocked && flex.content && (
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-relaxed text-zinc-100">
            {showTranslation && translated ? translated : flex.content}
          </p>
          <button
            onClick={onTranslate}
            disabled={translating}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-flex-cyan transition hover:text-flex-cyan/80 disabled:opacity-50"
          >
            <Languages className="h-3.5 w-3.5" />
            {translating ? 'Traduction…' : showTranslation ? "Voir l'original" : 'Traduire'}
          </button>
        </div>
      )}

      {!isLocked && flex.media_url &&
        (chain ? (
          <ChainedVideo urls={chain} />
        ) : isGrad ? (
          <div className={`mx-4 mb-3 aspect-[4/3] rounded-2xl bg-gradient-to-br ${GRADS[flex.media_url] ?? 'from-ink-600 to-ink-700'}`} />
        ) : isAudio ? (
          <div className="mx-4 mb-3 rounded-2xl border border-white/10 bg-ink-800/60 p-4">
            <WaveBars />
            <audio controls preload="none" src={flex.media_url} className="mt-3 w-full" />
          </div>
        ) : isVideo ? (
          <video
            controls
            playsInline
            preload="metadata"
            src={flex.media_url ?? undefined}
            className="mx-4 mb-3 aspect-[4/5] w-full rounded-2xl bg-black object-contain"
          />
        ) : (
          <SmartImage src={flex.media_url} seed={index + (flex.id.length || 0)} className="mx-4 mb-3 aspect-[4/5] rounded-2xl" />
        ))}

      {!isLocked && flex.sound_url && (
        <button
          onClick={toggleMusic}
          className="mx-4 mb-3 flex w-full max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.06] px-3 py-2.5 text-sm font-semibold text-gold active:scale-[0.99]"
        >
          {musicPlaying ? <Pause className="h-4 w-4 shrink-0" /> : <Play className="h-4 w-4 shrink-0" />}
          <Music2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{track?.title ?? 'Musique'}</span>
        </button>
      )}

      <div className="flex items-center gap-6 px-4 pb-4 pt-1">
        <FlexReaction count={count} liked={liked} onToggle={onToggle} />
        <button onClick={() => setCommentsOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition hover:text-zinc-200">
          <MessageCircle className="h-5 w-5" />
          {commentCount}
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition hover:text-gold">
          <Share2 className="h-5 w-5" />
          {shares > 0 ? compact(shares) : ''}
        </button>
        {flex.media_url && !isGrad && (
          <button
            onClick={onSave}
            aria-label="Télécharger et enregistrer"
            className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition hover:text-gold"
          >
            {saved ? <Check className="h-5 w-5 text-emerald-400" /> : <Download className="h-5 w-5" />}
          </button>
        )}
        <div className="ml-auto">
          <ReportButton targetType="post" targetId={flex.id} />
        </div>
      </div>

      {commentsOpen && (
        <CommentsSheet flexId={flex.id} authorId={flex.author_id} onClose={() => setCommentsOpen(false)} onAdded={() => { setCommentCount((c) => c + 1); recordEngagement(flex, 'comment') }} />
      )}
    </motion.article>
  )
}

/**
 * Lecteur de vidéo découpée : joue les segments à la chaîne, dans l'ordre.
 * La 1re partie ne démarre pas seule (feed) ; à la fin d'une partie, la suivante
 * s'enchaîne automatiquement. On peut sauter d'une partie à l'autre.
 */
function ChainedVideo({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Enchaînement auto : on ne lance que les parties suivantes (pas la 1re).
    if (idx > 0) ref.current?.play().catch(() => {})
  }, [idx])

  return (
    <div className="relative mx-4 mb-3">
      <video
        ref={ref}
        key={idx}
        src={urls[idx]}
        controls
        playsInline
        preload="metadata"
        onEnded={() => setIdx((i) => (i < urls.length - 1 ? i + 1 : i))}
        className="aspect-[4/5] w-full rounded-2xl bg-black object-contain"
      />
      <span className="absolute left-2 top-2 rounded-full bg-ink-900/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
        Partie {idx + 1}/{urls.length}
      </span>
      <div className="absolute right-2 top-2 flex gap-1 rounded-full bg-ink-900/60 px-2 py-1.5 backdrop-blur">
        {urls.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Partie ${i + 1}`}
            className={'h-1.5 rounded-full transition-all ' + (i === idx ? 'w-5 bg-gold' : 'w-1.5 bg-white/40')}
          />
        ))}
      </div>
    </div>
  )
}
