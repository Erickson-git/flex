import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCheck, ChevronLeft, Copy, CornerUpLeft, Download, Forward, ImagePlus, Loader2, Lock, Mic, Pencil, Phone, ScanFace, Search, Send, Smile, Trash2, Video, X } from 'lucide-react'
import type { ChatMessage, Profile } from '@/lib/types'
import { editMessage, fetchRoomMessages, reactMessage, sendRoomMessage, subscribeRoom, tombstoneMessage, touchDmThread } from '@/lib/api'
import { searchProfiles } from '@/lib/search'
import { useAuth } from '@/store/useAuth'
import { isAudioUrl, isVideoUrl, uploadMedia } from '@/lib/upload'
import { saveAndDownload } from '@/lib/gallery'
import { toastOk, toastErr } from '@/lib/toast'
import { joinRoomPresence, type RoomPresence } from '@/lib/presence'
import { isChatLocked, lockChat, unlockChat } from '@/lib/chatLock'
import { biometricEnabled, getFaceAccount, verifyBiometric } from '@/lib/biometric'
import { notifyUser } from '@/lib/push'
import { recordNotification } from '@/lib/notifications'
import { cn, dmRoomId, haptic, looksMalicious, sanitizeText, timeAgo } from '@/lib/utils'
import { Avatar } from './Avatar'
import { useCall } from './CallProvider'
import { useEmojiBurst } from './EmojiBurst'

const QUICK_EMOJIS = ['🔥', '😍', '💀', '👑', '💯', '🤯']
// prettier-ignore
const STICKERS = ['🔥','😂','😍','🥹','😎','😭','🤯','💀','👑','💯','🙏','👍','👏','🎉','💖','💔','🥳','😴','🤝','✨','💪','🤙','😏','🫶','🙌','🤷','😡','🤔','👀','🫡','🥶','🤡']
const REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '🔥']

/** Étiquette de séparateur de date : Aujourd'hui / Hier / date. */
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yest.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr', { day: 'numeric', month: 'long' })
}

/** Salle de chat temps réel partagée par les Squads et les Directs. */
export function ChatRoom({
  roomId,
  title,
  subtitle,
  accent = 'from-flex-violet to-flex-pink',
  headerExtra,
  notifyUserId,
  peer,
}: {
  roomId: string
  title: string
  subtitle?: string
  accent?: string
  headerExtra?: ReactNode
  notifyUserId?: string
  peer?: Profile
}) {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const { blast } = useEmojiBurst()
  const { startCall, available: callAvailable } = useCall()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null)
  const [sendErr, setSendErr] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec] = useState(0)
  const [peerOnline, setPeerOnline] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editMsg, setEditMsg] = useState<ChatMessage | null>(null)
  const [unlocked, setUnlocked] = useState(() => !isChatLocked(roomId))
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null)
  const [fwdQuery, setFwdQuery] = useState('')
  const [fwdResults, setFwdResults] = useState<Profile[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const presenceRef = useRef<RoomPresence | null>(null)
  const typingTimer = useRef<number | null>(null)
  // Enregistrement vocal
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recTimer = useRef<number | null>(null)
  const cancelRef = useRef(false)

  // Sécurité : on coupe le micro/timer si le composant est démonté en cours d'enregistrement.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (recTimer.current) clearInterval(recTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!me) return
    let active = true
    const load = () => fetchRoomMessages(roomId, me).then((m) => active && setMessages(m))
    load()
    const unsub = subscribeRoom(roomId, load)
    return () => {
      active = false
      unsub()
    }
  }, [roomId, me])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  // Présence temps réel : "en ligne" + "écrit…"
  useEffect(() => {
    if (!me) return
    const p = joinRoomPresence(roomId, me.id, {
      onOnline: setPeerOnline,
      onTyping: () => {
        setPeerTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = window.setTimeout(() => setPeerTyping(false), 3000)
      },
    })
    presenceRef.current = p
    return () => {
      p.leave()
      presenceRef.current = null
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [roomId, me?.id])

  // Verrou de conversation : (re)bloque à l'ouverture si le salon est verrouillé.
  useEffect(() => {
    setUnlocked(!isChatLocked(roomId))
  }, [roomId])

  // Recherche de destinataire pour le transfert (débouncée).
  useEffect(() => {
    if (!forwardMsg) return
    const q = fwdQuery.trim()
    if (!q) {
      setFwdResults([])
      return
    }
    const t = setTimeout(() => searchProfiles(q).then(setFwdResults).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [fwdQuery, forwardMsg])

  if (!me) return null

  // Aperçu court d'un message (pour la citation / le transfert).
  function previewOf(m: ChatMessage): string {
    const body = m.content?.startsWith('sticker:')
      ? m.content.slice(8)
      : m.content || (m.media_url ? '📎 Média' : '')
    return `${m.author_name}: ${body}`.slice(0, 90)
  }

  async function deliver(
    text: string,
    photo: string | null,
    reply: { id: string; preview: string } | null = null,
  ): Promise<boolean> {
    setSendErr(false)
    try {
      const msg = await sendRoomMessage(roomId, text, photo, me!, reply)
      setMessages((m) => [...m, msg])
      if (notifyUserId) {
        const preview = text.startsWith('sticker:') ? text.slice(8) : text || '📎 Média'
        notifyUser(notifyUserId, me!.display_name, preview, '/app/directs/' + roomId, 'dm:' + roomId)
        recordNotification(notifyUserId, 'message', `Message de ${me!.display_name}`, preview, {
          image: me!.avatar_url,
          link: '/app/directs/' + roomId,
          actorId: me!.id,
          actorName: me!.display_name,
        })
        touchDmThread(roomId, notifyUserId, preview)
      }
      return true
    } catch {
      setSendErr(true)
      return false
    }
  }

  async function send() {
    const raw = draft.trim()
    if ((!raw && !pendingPhoto) || looksMalicious(raw)) return
    const text = sanitizeText(raw, 1000)
    haptic(10)
    // Mode édition : on modifie le message au lieu d'en envoyer un nouveau.
    if (editMsg) {
      const id = editMsg.id
      setEditMsg(null)
      setDraft('')
      setMessages((list) => list.map((x) => (x.id === id ? { ...x, content: text, edited_at: new Date().toISOString() } : x)))
      try {
        await editMessage(id, text)
      } catch {
        setSendErr(true)
      }
      return
    }
    const photo = pendingPhoto
    const reply = replyTo ? { id: replyTo.id, preview: previewOf(replyTo) } : null
    setDraft('')
    setPendingPhoto(null)
    setReplyTo(null)
    const ok = await deliver(text, photo, reply)
    if (!ok) {
      // Échec (RLS / réseau) : on restaure le brouillon, rien n'est perdu.
      setDraft(raw)
      setPendingPhoto(photo)
      setReplyTo(replyTo)
    }
  }

  async function sendSticker(emoji: string) {
    haptic(8)
    setShowStickers(false)
    await deliver('sticker:' + emoji, null)
  }

  // Transfère le message sélectionné vers la conversation d'un autre utilisateur.
  async function doForward(p: Profile) {
    if (!forwardMsg || !me) return
    const room = dmRoomId(me.id, p.id)
    try {
      await sendRoomMessage(room, forwardMsg.content || '', forwardMsg.media_url ?? null, me)
      touchDmThread(room, p.id, previewOf(forwardMsg))
      toastOk('Transféré à @' + p.username)
    } catch {
      setSendErr(true)
    }
    setForwardMsg(null)
    setFwdQuery('')
    setFwdResults([])
  }

  function copyMessage(m: ChatMessage) {
    const txt = m.content?.startsWith('sticker:') ? m.content.slice(8) : m.content
    if (txt) navigator.clipboard?.writeText(txt).then(() => toastOk('Copié ✓')).catch(() => {})
  }

  // ── Verrou de conversation (Face ID/empreinte) ──────────────────
  async function toggleLock() {
    const uid = getFaceAccount()
    if (isChatLocked(roomId)) {
      if (uid && (await verifyBiometric(uid).catch(() => false))) {
        unlockChat(roomId)
        toastOk('Verrou retiré')
      }
    } else {
      if (!uid || !biometricEnabled(uid)) {
        toastErr('Active d\'abord le verrou facial dans ton profil.')
        return
      }
      lockChat(roomId)
      toastOk('Conversation verrouillée 🔒')
    }
  }

  async function tryUnlock() {
    const uid = getFaceAccount()
    if (!uid) {
      setUnlocked(true) // pas de biométrie configurée → on n'enferme pas
      return
    }
    if (await verifyBiometric(uid).catch(() => false)) setUnlocked(true)
  }

  async function doReact(emoji: string) {
    const m = actionMsg
    if (!m) return
    setActionMsg(null)
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, reaction: x.reaction === emoji ? null : emoji } : x)))
    reactMessage(m.id, emoji)
  }

  async function doDelete() {
    const m = actionMsg
    if (!m) return
    setActionMsg(null)
    // Supprimer pour tout le monde → laisse une trace « message supprimé ».
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, content: '', media_url: null, reaction: null, deleted: true } : x)))
    try {
      await tombstoneMessage(m.id)
    } catch {
      /* ignore */
    }
  }

  function react(emoji: string) {
    blast(emoji)
  }

  // Envoi privé d'une vraie photo/vidéo depuis l'appareil.
  async function pickMedia(f: File | null) {
    if (!f || !me) return
    setUploading(true)
    setSendErr(false)
    try {
      const url = await uploadMedia(f, me.id)
      setPendingPhoto(url)
    } catch {
      setSendErr(true)
    } finally {
      setUploading(false)
    }
  }

  // ── Message vocal : enregistrement micro → upload → envoi ──────────
  async function startRecording() {
    if (recording || !me) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      cancelRef.current = false
      const mime =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (recTimer.current) {
          clearInterval(recTimer.current)
          recTimer.current = null
        }
        setRecording(false)
        setRecSec(0)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        if (cancelRef.current || !blob.size || !me) return
        setUploading(true)
        setSendErr(false)
        try {
          // Extension .weba → reconnu comme AUDIO (et non vidéo) par isAudioUrl.
          const file = new File([blob], `voice-${Date.now()}.weba`, { type: 'audio/webm' })
          const url = await uploadMedia(file, me.id)
          await deliver('', url)
        } catch {
          setSendErr(true)
        } finally {
          setUploading(false)
        }
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
      setRecSec(0)
      haptic(12)
      recTimer.current = window.setInterval(() => setRecSec((s) => s + 1), 1000)
    } catch {
      // micro refusé / indisponible
      setSendErr(true)
    }
  }

  /** Arrête l'enregistrement : envoie le vocal (send=true) ou l'annule. */
  function stopRecording(send: boolean) {
    cancelRef.current = !send
    haptic(8)
    try {
      recRef.current?.stop()
    } catch {
      /* déjà arrêté */
    }
  }

  const fmtRec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div
      className="mx-auto flex h-[100dvh] max-w-lg flex-col bg-ink-900"
      style={{
        backgroundImage: "linear-gradient(rgba(8,8,10,0.32), rgba(8,8,10,0.32)), url('/chat-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* En-tête */}
      <header className={cn('safe-top bg-gradient-to-r px-4 pb-3 pt-2', accent)}>
        <div className="flex items-center gap-3 rounded-b-sm">
          <button onClick={() => navigate(-1)} className="rounded-full p-1 text-ink-900">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="font-display text-lg font-bold text-ink-900">{title}</div>
            {peerTyping ? (
              <div className="text-xs font-semibold text-ink-900">écrit…</div>
            ) : peerOnline ? (
              <div className="flex items-center gap-1 text-xs font-medium text-ink-900/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> en ligne
              </div>
            ) : (
              subtitle && <div className="text-xs font-medium text-ink-900/70">{subtitle}</div>
            )}
          </div>
          <button onClick={() => { setSearchOpen((v) => !v); setSearch('') }} aria-label="Rechercher" className="grid h-9 w-9 place-items-center rounded-full text-ink-900 active:scale-90">
            <Search className="h-5 w-5" />
          </button>
          <button onClick={toggleLock} aria-label="Verrouiller la conversation" className="grid h-9 w-9 place-items-center rounded-full text-ink-900 active:scale-90">
            <Lock className={cn('h-5 w-5', isChatLocked(roomId) ? '' : 'opacity-50')} />
          </button>
          {peer && callAvailable ? (
            <div className="flex items-center gap-1">
              <button onClick={() => startCall(peer, 'audio')} aria-label="Appel audio" className="grid h-9 w-9 place-items-center rounded-full text-ink-900 active:scale-90">
                <Phone className="h-5 w-5" />
              </button>
              <button onClick={() => startCall(peer, 'video')} aria-label="Appel vidéo" className="grid h-9 w-9 place-items-center rounded-full text-ink-900 active:scale-90">
                <Video className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-ink-900/20 px-2.5 py-1 text-[11px] font-bold text-ink-900">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-900" />
              LIVE
            </span>
          )}
        </div>
        {headerExtra}
      </header>

      {/* Barre de recherche dans la conversation */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-white/5 bg-ink-900/60 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans la conversation…"
            autoFocus
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <button onClick={() => { setSearchOpen(false); setSearch('') }} className="text-zinc-500"><X className="h-5 w-5" /></button>
        </div>
      )}

      {/* Fil */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {(search.trim()
          ? messages.filter((m) => (m.content || '').toLowerCase().includes(search.trim().toLowerCase()))
          : messages
        ).map((m, idx, arr) => {
          const mine = m.author_id === me.id
          const sticker = m.content?.startsWith('sticker:') ? m.content.slice(8) : null
          const prev = arr[idx - 1]
          const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
          return (
            <Fragment key={m.id}>
              {showDate && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-ink-900/50 px-3 py-1 text-[10px] font-semibold text-zinc-400 backdrop-blur">{dayLabel(m.created_at)}</span>
                </div>
              )}
              <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
              {!mine && <Avatar name={m.author_name} url={m.author_avatar} size={30} />}
              <div className={cn('max-w-[76%]', mine && 'items-end')} onClick={() => setActionMsg(m)}>
                {!mine && <div className="mb-0.5 ml-1 text-[11px] font-semibold text-zinc-500">{m.author_name}</div>}
                {sticker ? (
                  <div className={cn('text-6xl leading-none drop-shadow', mine ? 'text-right' : 'text-left')}>{sticker}</div>
                ) : (
                  <div
                    className={cn(
                      'overflow-hidden rounded-2xl text-[15px]',
                      mine ? 'bg-gold-grad text-ink-900' : 'glass text-zinc-100',
                    )}
                  >
                    {m.deleted ? (
                      <p className="px-3.5 py-2 text-sm italic opacity-70">🚫 Message supprimé</p>
                    ) : (
                    <>
                    {m.reply_preview && (
                      <div className={cn('mx-2 mt-2 rounded-lg border-l-2 px-2 py-1 text-xs', mine ? 'border-ink-900/40 bg-ink-900/10 text-ink-900/80' : 'border-gold/60 bg-white/5 text-zinc-300')}>
                        {m.reply_preview}
                      </div>
                    )}
                    {m.media_url &&
                      (isVideoUrl(m.media_url) ? (
                        <video src={m.media_url} controls playsInline preload="metadata" className="w-60 bg-black" />
                      ) : isAudioUrl(m.media_url) ? (
                        <div className="flex items-center gap-2 px-2.5 py-2">
                          <Mic className={cn('h-4 w-4 shrink-0', mine ? 'text-ink-900/70' : 'text-gold')} />
                          <audio src={m.media_url} controls preload="metadata" className="h-9 w-52" />
                        </div>
                      ) : (
                        <img src={m.media_url} alt="" className="w-60 object-cover" />
                      ))}
                    {m.content && <p className="px-3.5 py-2 leading-snug">{m.content}</p>}
                    </>
                    )}
                  </div>
                )}
                {m.reaction && (
                  <div className={cn('-mt-1.5', mine ? 'text-right' : 'pl-1')}>
                    <span className="inline-block rounded-full bg-ink-800 px-1.5 py-0.5 text-sm shadow-card">{m.reaction}</span>
                  </div>
                )}
                <div className={cn('mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600', mine ? 'justify-end' : 'ml-1')}>
                  {m.edited_at && !m.deleted && <span className="italic">modifié</span>}
                  <span>{timeAgo(m.created_at)}</span>
                  {mine && !m.deleted && (peerOnline ? <CheckCheck className="h-3 w-3 text-flex-cyan" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* Réactions explosives */}
      <div className="flex justify-around px-4 py-1.5">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => react(e)}
            className="text-2xl transition active:scale-125"
            aria-label={`Réagir ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Photo en attente */}
      <AnimatePresence>
        {pendingPhoto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="relative inline-block">
              {isVideoUrl(pendingPhoto) ? (
                <video src={pendingPhoto} muted className="h-20 w-20 rounded-xl bg-black object-cover" />
              ) : (
                <img src={pendingPhoto} alt="" className="h-20 w-20 rounded-xl object-cover" />
              )}
              <button
                onClick={() => setPendingPhoto(null)}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink-800 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sendErr && (
        <div className="px-4 pb-1 text-center text-xs text-flex-pink">Échec de l'envoi — réessaie.</div>
      )}

      {/* Panneau de stickers */}
      {showStickers && (
        <div className="grid grid-cols-6 gap-1 border-t border-white/5 px-3 py-2">
          {STICKERS.map((s) => (
            <button key={s} onClick={() => sendSticker(s)} className="grid h-12 place-items-center rounded-xl text-3xl transition active:scale-110 active:bg-white/5">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Barre d'édition au-dessus de la saisie */}
      {editMsg && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border-l-2 border-flex-cyan/70 bg-white/5 px-3 py-1.5">
          <Pencil className="h-4 w-4 shrink-0 text-flex-cyan" />
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">Modification du message…</span>
          <button onClick={() => { setEditMsg(null); setDraft('') }} className="shrink-0 text-zinc-500"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Barre de réponse (citation) au-dessus de la saisie */}
      {replyTo && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border-l-2 border-gold/70 bg-white/5 px-3 py-1.5">
          <CornerUpLeft className="h-4 w-4 shrink-0 text-gold" />
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{previewOf(replyTo)}</span>
          <button onClick={() => setReplyTo(null)} className="shrink-0 text-zinc-500"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Saisie */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => pickMedia(e.target.files?.[0] ?? null)}
      />
      {recording ? (
        // ── Barre d'enregistrement vocal ──────────────────────────────
        <div className="safe-bottom flex items-center gap-3 border-t border-white/5 px-3 pt-2">
          <button
            onClick={() => stopRecording(false)}
            aria-label="Annuler"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-flex-pink active:scale-90"
          >
            <Trash2 className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full border border-flex-pink/30 bg-white/5 px-5 py-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-flex-pink" />
            <span className="text-sm font-semibold text-zinc-200">Enregistrement…</span>
            <span className="ml-auto font-mono text-sm tabular-nums text-zinc-400">{fmtRec(recSec)}</span>
          </div>
          <button
            onClick={() => stopRecording(true)}
            aria-label="Envoyer le vocal"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 transition active:scale-90"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="safe-bottom flex items-center gap-2 border-t border-white/5 px-3 pt-2">
          <button
            onClick={() => { haptic(8); setShowStickers((v) => !v) }}
            className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', showStickers ? 'text-gold' : 'text-zinc-400')}
          >
            <Smile className="h-6 w-6" />
          </button>
          <button
            onClick={() => { haptic(8); fileRef.current?.click() }}
            disabled={uploading}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-400 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          </button>
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); presenceRef.current?.sendTyping() }}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Message…"
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
          />
          {draft.trim() || pendingPhoto ? (
            <button
              onClick={send}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 transition active:scale-90"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={uploading}
              aria-label="Message vocal"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 transition active:scale-90 disabled:opacity-50"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Actions sur un message : réagir / supprimer */}
      {actionMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/60 p-6 backdrop-blur-sm" onClick={() => setActionMsg(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-xs rounded-3xl p-4">
            <div className="flex justify-around">
              {REACTIONS.map((e) => (
                <button key={e} onClick={() => doReact(e)} className="text-3xl transition active:scale-125">
                  {e}
                </button>
              ))}
            </div>

            {/* Répondre · Copier · Transférer */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => { const m = actionMsg; setActionMsg(null); setReplyTo(m) }}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 py-2.5 text-[11px] font-semibold text-zinc-200 active:scale-95"
              >
                <CornerUpLeft className="h-4 w-4 text-flex-cyan" /> Répondre
              </button>
              <button
                onClick={() => { const m = actionMsg; setActionMsg(null); if (m) copyMessage(m) }}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 py-2.5 text-[11px] font-semibold text-zinc-200 active:scale-95"
              >
                <Copy className="h-4 w-4 text-flex-violet" /> Copier
              </button>
              <button
                onClick={() => { const m = actionMsg; setActionMsg(null); setForwardMsg(m) }}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 py-2.5 text-[11px] font-semibold text-zinc-200 active:scale-95"
              >
                <Forward className="h-4 w-4 text-gold" /> Transférer
              </button>
            </div>

            {actionMsg.media_url && (
              <button
                onClick={() => {
                  const url = actionMsg.media_url!
                  setActionMsg(null)
                  saveAndDownload(url, `Message de ${actionMsg.author_name}`)
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 py-3 text-sm font-bold text-gold active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Télécharger dans ma galerie
              </button>
            )}
            {actionMsg.author_id === me.id && !!actionMsg.content && !actionMsg.content.startsWith('sticker:') && !actionMsg.deleted && (
              <button
                onClick={() => { const m = actionMsg; setActionMsg(null); setReplyTo(null); setEditMsg(m); setDraft(m.content) }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-3 text-sm font-bold text-zinc-200 active:scale-[0.98]"
              >
                <Pencil className="h-4 w-4" /> Modifier
              </button>
            )}
            {actionMsg.author_id === me.id && !actionMsg.deleted && (
              <button onClick={doDelete} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-flex-pink/30 py-3 text-sm font-bold text-flex-pink active:scale-[0.98]">
                <Trash2 className="h-4 w-4" /> Supprimer pour tout le monde
              </button>
            )}
          </div>
        </div>
      )}

      {/* Écran de verrouillage de la conversation */}
      {!unlocked && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-ink-900 px-8 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gold/10">
            <Lock className="h-10 w-10 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold">Conversation verrouillée</h2>
            <p className="mt-1 text-sm text-zinc-400">Déverrouille avec ton visage ou ton empreinte.</p>
          </div>
          <button onClick={tryUnlock} className="btn-gold flex items-center gap-2 text-lg">
            <ScanFace className="h-5 w-5" /> Déverrouiller
          </button>
          <button onClick={() => navigate(-1)} className="text-sm font-semibold text-zinc-500">Retour</button>
        </div>
      )}

      {/* Fenêtre de transfert : choisir un destinataire */}
      {forwardMsg && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={() => { setForwardMsg(null); setFwdQuery('') }}>
          <div onClick={(e) => e.stopPropagation()} className="safe-bottom w-full max-w-md rounded-t-3xl border-t border-white/10 bg-ink-800/95 p-5 backdrop-blur-xl sm:rounded-3xl sm:border">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><Forward className="h-5 w-5 text-gold" /> Transférer à…</h2>
              <button onClick={() => { setForwardMsg(null); setFwdQuery('') }} className="text-zinc-500"><X className="h-6 w-6" /></button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={fwdQuery}
                onChange={(e) => setFwdQuery(e.target.value)}
                placeholder="Rechercher un pseudo ou numéro…"
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none placeholder:text-zinc-600 focus:border-gold/40"
                autoCapitalize="none"
              />
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {fwdResults.filter((p) => p.id !== me.id).map((p) => (
                <button key={p.id} onClick={() => doForward(p)} className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-ink-900/40 p-2.5 text-left active:scale-[0.99]">
                  <Avatar name={p.display_name} url={p.avatar_url} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{p.display_name}</div>
                    <div className="truncate text-xs text-zinc-500">@{p.username}</div>
                  </div>
                  <Forward className="h-4 w-4 shrink-0 text-gold" />
                </button>
              ))}
              {fwdQuery.trim() && fwdResults.length === 0 && (
                <p className="py-6 text-center text-sm text-zinc-600">Aucun résultat.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
