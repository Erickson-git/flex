import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Crown, Loader2, MessageCircle, Mic, MicOff, MoreHorizontal, PhoneOff, Search, Send, Share2, UserPlus, Users, Video, VideoOff, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'
import {
  fetchRoomKind,
  fetchRoomMembers,
  inviteMember,
  joinCallRoom,
  kickMember,
  promoteMember,
  searchProfiles,
  type RoomMember,
  type SearchResult,
} from '@/lib/groupCall'
import { notifyUser } from '@/lib/push'
import { recordNotification } from '@/lib/notifications'
import { Avatar } from '@/components/Avatar'
import { cn, haptic } from '@/lib/utils'

import { RTC_CONFIG as RTC } from '@/lib/rtc'

interface SignalMsg {
  from: string
  to: string
  type: 'offer' | 'answer' | 'ice' | 'kicked'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export default function GroupCallRoom() {
  const { id: roomId = '' } = useParams()
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const [kind, setKind] = useState<'audio' | 'video'>('video')
  const [members, setMembers] = useState<RoomMember[]>([])
  const [remotes, setRemotes] = useState<{ id: string; stream: MediaStream }[]>([])
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [ready, setReady] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chat, setChat] = useState<{ id: string; from: string; name: string; text: string }[]>([])
  const [chatText, setChatText] = useState('')
  const [full, setFull] = useState(false)

  const localRef = useRef<HTMLVideoElement>(null)
  const localStream = useRef<MediaStream | null>(null)
  const channel = useRef<RealtimeChannel | null>(null)
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map())
  const membersRef = useRef<RoomMember[]>([])

  const amAdmin = members.find((m) => m.user_id === me?.id)?.role === 'admin'

  useEffect(() => {
    membersRef.current = members
  }, [members])

  useEffect(() => {
    if (!me || !supabase) return
    let active = true

    function send(payload: Omit<SignalMsg, 'from'>) {
      channel.current?.send({ type: 'broadcast', event: 'signal', payload: { ...payload, from: me!.id } })
    }

    function refreshMembers() {
      fetchRoomMembers(roomId).then((m) => active && setMembers(m)).catch(() => {})
    }

    function createPeer(pid: string, initiator: boolean): RTCPeerConnection {
      const pc = new RTCPeerConnection(RTC)
      peers.current.set(pid, pc)
      const remoteStream = new MediaStream()
      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t))
        setRemotes((r) => [...r.filter((x) => x.id !== pid), { id: pid, stream: remoteStream }])
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'ice', to: pid, candidate: e.candidate.toJSON() })
      }
      pc.onconnectionstatechange = () => {
        // 'disconnected' = coupure temporaire → on laisse récupérer.
        if (['failed', 'closed'].includes(pc.connectionState)) {
          pc.close()
          peers.current.delete(pid)
          setRemotes((r) => r.filter((x) => x.id !== pid))
        }
      }
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' && initiator) {
          pc.restartIce?.()
        }
      }
      if (initiator) {
        pc.onnegotiationneeded = async () => {
          try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            send({ type: 'offer', to: pid, sdp: offer })
          } catch {
            /* ignore */
          }
        }
      }
      localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!))
      return pc
    }

    function onPresence(ch: RealtimeChannel) {
      const state = ch.presenceState() as Record<string, unknown[]>
      const present = Object.keys(state)
      refreshMembers()
      present.forEach((pid) => {
        if (pid === me!.id || peers.current.has(pid)) return
        if (me!.id < pid) createPeer(pid, true) // évite la collision : le plus petit id initie
      })
      peers.current.forEach((pc, pid) => {
        if (!present.includes(pid)) {
          pc.close()
          peers.current.delete(pid)
          setRemotes((r) => r.filter((x) => x.id !== pid))
        }
      })
    }

    async function onSignal(p: SignalMsg) {
      if (p.to !== me!.id) return
      if (p.type === 'kicked') {
        leave()
        navigate('/app', { replace: true })
        return
      }
      if (p.type === 'offer' && p.sdp) {
        let pc = peers.current.get(p.from)
        if (!pc) pc = createPeer(p.from, false)
        await pc.setRemoteDescription(p.sdp)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send({ type: 'answer', to: p.from, sdp: answer })
      } else if (p.type === 'answer' && p.sdp) {
        const pc = peers.current.get(p.from)
        if (pc) await pc.setRemoteDescription(p.sdp)
      } else if (p.type === 'ice' && p.candidate) {
        const pc = peers.current.get(p.from)
        if (pc?.remoteDescription) {
          try {
            await pc.addIceCandidate(p.candidate)
          } catch {
            /* ignore */
          }
        }
      }
    }

    function leave() {
      peers.current.forEach((pc) => pc.close())
      peers.current.clear()
      localStream.current?.getTracks().forEach((t) => t.stop())
      localStream.current = null
      if (channel.current && supabase) supabase.removeChannel(channel.current)
      channel.current = null
    }

    ;(async () => {
      const k = await fetchRoomKind(roomId)
      if (!active) return
      setKind(k)
      try {
        await joinCallRoom(roomId)
      } catch {
        if (active) setFull(true)
        return
      }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: k === 'video' ? { facingMode: 'user' } : false })
      } catch {
        navigate(-1)
        return
      }
      if (!active) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      localStream.current = stream
      if (localRef.current) localRef.current.srcObject = stream
      setReady(true)
      refreshMembers()
      const ch = supabase!.channel(`callroom:${roomId}`, {
        config: { presence: { key: me!.id }, broadcast: { self: false } },
      })
      ch.on('presence', { event: 'sync' }, () => onPresence(ch))
      ch.on('broadcast', { event: 'signal' }, ({ payload }) => onSignal(payload as SignalMsg))
      ch.on('broadcast', { event: 'chat' }, ({ payload }) => active && setChat((c) => [...c, payload as { id: string; from: string; name: string; text: string }]))
      ch.subscribe(async (st) => {
        if (st === 'SUBSCRIBED') await ch.track({ id: me!.id, name: me!.display_name, avatar: me!.avatar_url })
      })
      channel.current = ch
    })()

    return () => {
      active = false
      leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, me?.id])

  function hangup() {
    navigate(-1)
  }
  function toggleMute() {
    const n = !muted
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !n))
    setMuted(n)
  }
  function toggleCam() {
    const n = !camOff
    localStream.current?.getVideoTracks().forEach((t) => (t.enabled = !n))
    setCamOff(n)
  }
  async function share() {
    haptic(12)
    const url = `${location.origin}/app/call/${roomId}`
    try {
      if (navigator.share) await navigator.share({ title: 'Appel FLEX', text: 'Rejoins mon appel ✦', url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* annulé */
    }
  }
  async function kick(uid: string) {
    try {
      await kickMember(roomId, uid)
      channel.current?.send({ type: 'broadcast', event: 'signal', payload: { from: me!.id, to: uid, type: 'kicked' } })
      setMembers((m) => m.filter((x) => x.user_id !== uid))
    } catch {
      /* ignore */
    }
  }
  async function promote(uid: string) {
    try {
      await promoteMember(roomId, uid)
      setMembers((m) => m.map((x) => (x.user_id === uid ? { ...x, role: 'admin' } : x)))
    } catch {
      /* ignore */
    }
  }

  function sendChat() {
    const t = chatText.trim()
    if (!t || !channel.current || !me) return
    const msg = { id: `${me.id}-${chat.length}-${t.length}`, from: me.id, name: me.display_name, text: t.slice(0, 500) }
    channel.current.send({ type: 'broadcast', event: 'chat', payload: msg })
    setChat((c) => [...c, msg])
    setChatText('')
  }

  const remoteCount = remotes.length + 1
  const gridCols = remoteCount <= 1 ? 'grid-cols-1' : 'grid-cols-2'

  if (full) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900 p-8 text-center">
        <div>
          <Users className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
          <div className="text-lg font-bold text-white">Salon plein</div>
          <p className="mt-1 text-sm text-zinc-500">Limite atteinte ({kind === 'audio' ? 72 : 9} max).</p>
          <button onClick={() => navigate('/app')} className="mt-5 rounded-2xl bg-gold-grad px-6 py-3 font-bold text-ink-900">
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink-900">
      {/* Grille des participants */}
      <div className={cn('grid flex-1 gap-1 overflow-hidden p-1', gridCols)}>
        <div className="relative overflow-hidden rounded-2xl bg-black">
          {kind === 'video' && !camOff ? (
            <video ref={localRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <Avatar name={me?.display_name ?? 'Moi'} url={me?.avatar_url} size={88} ring />
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-xs font-semibold text-white">
            Toi {muted && '· 🔇'}
          </span>
          {!ready && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>}
        </div>
        {remotes.map((r) => {
          const mem = members.find((m) => m.user_id === r.id)
          return <RemoteTile key={r.id} stream={r.stream} name={mem?.name ?? '…'} avatar={mem?.avatar ?? null} video={kind === 'video'} />
        })}
      </div>

      {/* Barre de contrôles minimale : tout le reste est dans le menu Options */}
      <div className="safe-bottom flex items-center justify-center gap-6 px-4 pb-6 pt-3">
        <button onClick={toggleMute} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white active:scale-90">
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <button onClick={() => setShowOptions(true)} className="relative grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white active:scale-90">
          <MoreHorizontal className="h-6 w-6" />
          {chat.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-flex-pink" />}
        </button>
        <button onClick={hangup} className="grid h-16 w-16 place-items-center rounded-full bg-flex-pink text-white shadow-glow active:scale-90">
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>

      {showOptions && (
        <div className="fixed inset-0 z-[71] flex items-end bg-ink-900/70 backdrop-blur-sm" onClick={() => setShowOptions(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass w-full rounded-t-3xl p-4 pb-10">
            <div className="mb-2 px-2 text-sm font-bold uppercase tracking-wider text-zinc-400">Options de l'appel</div>
            {kind === 'video' && (
              <OptRow icon={camOff ? VideoOff : Video} label={camOff ? 'Activer la caméra' : 'Couper la caméra'} onClick={() => { toggleCam(); setShowOptions(false) }} />
            )}
            <OptRow icon={Share2} label="Partager le lien de l'appel" onClick={() => { setShowOptions(false); share() }} />
            {amAdmin && <OptRow icon={UserPlus} label="Ajouter quelqu'un (pseudo)" onClick={() => { setShowOptions(false); setShowAdd(true) }} />}
            <OptRow icon={MessageCircle} label="Messages de l'appel" onClick={() => { setShowOptions(false); setShowChat(true) }} />
            <OptRow icon={Users} label={`Participants (${members.length})`} onClick={() => { setShowOptions(false); setShowPanel(true) }} />
          </div>
        </div>
      )}

      {showPanel && (
        <MembersPanel
          members={members}
          meId={me?.id ?? ''}
          amAdmin={amAdmin}
          onClose={() => setShowPanel(false)}
          onKick={kick}
          onPromote={promote}
        />
      )}
      {showAdd && <AddSheet roomId={roomId} existing={members.map((m) => m.user_id)} onClose={() => setShowAdd(false)} />}

      {showChat && (
        <div className="fixed inset-0 z-[72] flex flex-col bg-ink-900/80 backdrop-blur-sm" onClick={() => setShowChat(false)}>
          <div onClick={(e) => e.stopPropagation()} className="mt-auto flex h-[70dvh] flex-col rounded-t-3xl border-t border-white/10 bg-ink-800">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="font-bold text-white">Messages de l'appel</span>
              <button onClick={() => setShowChat(false)} className="text-zinc-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
              {chat.length === 0 && <p className="py-10 text-center text-sm text-zinc-600">Aucun message.</p>}
              {chat.map((m) => {
                const mine = m.from === me?.id
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-gold-grad text-ink-900' : 'glass text-zinc-100')}>
                      {!mine && <div className="text-[11px] font-bold text-gold">{m.name}</div>}
                      {m.text}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="safe-bottom flex items-center gap-2 px-3 pb-3 pt-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Message…"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-600"
              />
              <button onClick={sendChat} className="grid h-12 w-12 place-items-center rounded-full bg-gold-grad text-ink-900 active:scale-90">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RemoteTile({ stream, name, avatar, video }: { stream: MediaStream; name: string; avatar: string | null; video: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
    if (audioRef.current) audioRef.current.srcObject = stream
  }, [stream])
  const hasVideo = video && stream.getVideoTracks().some((t) => t.enabled)
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {hasVideo ? (
        <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <Avatar name={name} url={avatar} size={88} ring />
          <audio ref={audioRef} autoPlay />
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-xs font-semibold text-white">{name}</span>
    </div>
  )
}

function MembersPanel({
  members,
  meId,
  amAdmin,
  onClose,
  onKick,
  onPromote,
}: {
  members: RoomMember[]
  meId: string
  amAdmin: boolean
  onClose: () => void
  onKick: (uid: string) => void
  onPromote: (uid: string) => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-ink-900/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass w-full rounded-t-3xl p-5 pb-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold text-white">Participants ({members.length})</span>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-400"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar name={m.name ?? '?'} url={m.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                  {m.name ?? m.username} {m.user_id === meId && <span className="text-xs text-zinc-500">(toi)</span>}
                  {m.role === 'admin' && <Crown className="h-3.5 w-3.5 text-gold" />}
                </div>
                <div className="text-xs text-zinc-500">@{m.username}</div>
              </div>
              {amAdmin && m.user_id !== meId && (
                <div className="flex gap-2">
                  {m.role !== 'admin' && (
                    <button onClick={() => onPromote(m.user_id)} className="rounded-lg border border-gold/30 px-2.5 py-1.5 text-xs font-bold text-gold">
                      Admin
                    </button>
                  )}
                  <button onClick={() => onKick(m.user_id)} className="rounded-lg border border-flex-pink/30 px-2.5 py-1.5 text-xs font-bold text-flex-pink">
                    Exclure
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OptRow({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-white active:bg-white/5">
      <Icon className="h-5 w-5 text-gold" />
      <span className="font-semibold">{label}</span>
    </button>
  )
}

function AddSheet({ roomId, existing, onClose }: { roomId: string; existing: string[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [added, setAdded] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 2) {
        setResults([])
        return
      }
      searchProfiles(q).then(setResults).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  async function add(r: SearchResult) {
    setBusy(true)
    try {
      await inviteMember(roomId, r.id)
      // Prévenir l'invité pour qu'il rejoigne l'appel en cours (notif + push).
      const me = useAuth.getState().me
      if (me) {
        const link = `/app/call/${roomId}`
        notifyUser(r.id, `${me.display_name} t'invite à un appel`, 'Appuie pour rejoindre', link, 'callinvite:' + roomId)
        recordNotification(r.id, 'call', 'Invitation à un appel', `${me.display_name} t'invite à un appel de groupe`, {
          image: me.avatar_url,
          link,
          actorId: me.id,
          actorName: me.display_name,
        })
      }
      setAdded((a) => [...a, r.id])
      haptic([10, 20, 10])
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end bg-ink-900/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass w-full rounded-t-3xl p-5 pb-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold text-white">Ajouter par pseudo</span>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-400"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
          <Search className="h-5 w-5 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un pseudo…"
            autoFocus
            className="w-full bg-transparent py-3.5 text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="mt-3 max-h-[50dvh] space-y-1 overflow-y-auto">
          {results.map((r) => {
            const isIn = existing.includes(r.id) || added.includes(r.id)
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Avatar name={r.display_name} url={r.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{r.display_name}</div>
                  <div className="text-xs text-zinc-500">@{r.username}</div>
                </div>
                <button
                  onClick={() => !isIn && add(r)}
                  disabled={isIn || busy}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-bold active:scale-95', isIn ? 'bg-white/5 text-zinc-500' : 'bg-gold-grad text-ink-900')}
                >
                  {isIn ? 'Invité' : 'Inviter'}
                </button>
              </div>
            )
          })}
          {q.trim().length >= 2 && results.length === 0 && <div className="py-6 text-center text-sm text-zinc-600">Aucun résultat.</div>}
        </div>
      </div>
    </div>
  )
}
