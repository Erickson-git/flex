import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Circle, Layers, MessageSquare, Mic, MicOff, MoreHorizontal, Phone, PhoneOff, RefreshCw, Send, SwitchCamera, Video, VideoOff, X } from 'lucide-react'
import { DEMO_MODE, supabase } from '@/lib/supabase'
import { notifyUser } from '@/lib/push'
import { ringtoneUrl } from '@/lib/audioLibrary'
import { recordNotification } from '@/lib/notifications'
import { recordCall } from '@/lib/calls'
import { RTC_CONFIG } from '@/lib/rtc'
import { sendRoomMessage, touchDmThread } from '@/lib/api'
import { callPreview, encodeCall } from '@/lib/callMessage'
import { dmRoomId } from '@/lib/utils'
import { uploadMedia } from '@/lib/upload'
import { saveToGallery } from '@/lib/gallery'
import { useAuth } from '@/store/useAuth'
import type { Profile } from '@/lib/types'
import { Avatar } from './Avatar'
import { haptic } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Appels audio/vidéo 1-à-1 en WebRTC (P2P, gratuit). Signalisation
// via Supabase Realtime broadcast : chaque utilisateur écoute sa
// "boîte" call-inbox:<id>. L'appelant y dépose l'invitation (offre
// SDP), le destinataire répond, les ICE candidates transitent dans
// les deux sens. STUN public Google pour la traversée NAT.
//   ⚠️ Les deux doivent être en ligne dans l'app en même temps.
// ─────────────────────────────────────────────────────────────

type CallKind = 'audio' | 'video'
type Status = 'idle' | 'outgoing' | 'incoming' | 'connected'

interface SignalPayload {
  from: string
  kind: 'invite' | 'answer' | 'ice' | 'hangup' | 'decline' | 'switch' | 'switch-answer' | 'reoffer' | 'reanswer' | 'chat'
  callKind?: CallKind
  name?: string
  avatar?: string | null
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  text?: string
}

interface CallChatMsg {
  from: 'me' | 'them'
  text: string
}

interface CallContext {
  startCall: (peer: Profile, kind: CallKind) => void
  available: boolean
}

const Ctx = createContext<CallContext>({ startCall: () => {}, available: false })
export const useCall = () => useContext(Ctx)

// Config ICE centralisée (STUN + TURN pilotable par env) : voir src/lib/rtc.ts.

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function CallProvider({ children }: { children: ReactNode }) {
  const me = useAuth((s) => s.me)
  const [status, setStatus] = useState<Status>('idle')
  const [peer, setPeer] = useState<{ id: string; name: string; avatar: string | null } | null>(null)
  const [callKind, setCallKind] = useState<CallKind>('audio')
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [cameraMode, setCameraMode] = useState<'front' | 'back' | 'dual'>('front')
  const [cameraOff, setCameraOff] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<CallChatMsg[]>([])
  const [recording, setRecording] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const remoteStream = useRef<MediaStream | null>(null)
  const inbox = useRef<RealtimeChannel | null>(null)
  const out = useRef<{ ch: RealtimeChannel; id: string } | null>(null)
  const pendingIce = useRef<RTCIceCandidateInit[]>([])
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null)
  const outPromise = useRef<Promise<RealtimeChannel> | null>(null)
  const pendingKey = useRef<string | null>(null)
  const roleRef = useRef<'caller' | 'callee' | null>(null)
  const connectedRef = useRef(false)
  const declinedRef = useRef(false)
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const remoteAudio = useRef<HTMLAudioElement>(null)
  const ringRef = useRef<HTMLAudioElement | null>(null)
  const durationRef = useRef(0)
  const videoSender = useRef<RTCRtpSender | null>(null)
  const curVideoTrack = useRef<MediaStreamTrack | null>(null)
  const camStreams = useRef<MediaStream[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const dualSwapRef = useRef(false)
  // Enregistrement d'appel
  const recRef = useRef<MediaRecorder | null>(null)
  const recChunks = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const recPeerRef = useRef('')

  const available = !!me && !DEMO_MODE && !!supabase

  // Sonnerie : joue la piste choisie pendant que ça sonne (entrant/sortant).
  useEffect(() => {
    const ringing = status === 'incoming' || status === 'outgoing'
    if (ringing) {
      if (!ringRef.current) {
        ringRef.current = new Audio(ringtoneUrl())
        ringRef.current.loop = true
      } else {
        ringRef.current.src = ringtoneUrl()
      }
      ringRef.current.volume = status === 'outgoing' ? 0.35 : 0.85
      ringRef.current.play().catch(() => {})
    } else if (ringRef.current) {
      ringRef.current.pause()
      ringRef.current.currentTime = 0
    }
  }, [status])

  // Façon WhatsApp : dès qu'un appel est actif, on coupe toute autre musique/son
  // de la page (musique de profil, vocaux…) — sauf les éléments de l'appel.
  useEffect(() => {
    const active = status === 'incoming' || status === 'outgoing' || status === 'connected'
    if (!active) return
    document.querySelectorAll('audio, video').forEach((el) => {
      if (!el.hasAttribute('data-call')) (el as HTMLMediaElement).pause()
    })
  }, [status])

  // Boîte de réception d'appels — active tant qu'on est connecté.
  useEffect(() => {
    if (!available || !me) return
    const ch = supabase!.channel('call-inbox:' + me.id, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'signal' }, ({ payload }) => onSignal(payload as SignalPayload))
    ch.subscribe()
    inbox.current = ch
    // Fiabilité : on sonne aussi dès qu'un appel en attente est inséré pour moi
    // (au cas où le signal broadcast serait perdu), et au démarrage.
    const pcCh = supabase!
      .channel('pending-' + me.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pending_calls', filter: `to_user=eq.${me.id}` },
        () => checkPending(),
      )
      .subscribe()
    checkPending()
    return () => {
      supabase!.removeChannel(ch)
      supabase!.removeChannel(pcCh)
      inbox.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, me?.id])

  // (Ré)attache les flux aux éléments média à chaque changement d'état.
  useEffect(() => {
    if (remoteVideo.current && remoteStream.current) {
      remoteVideo.current.srcObject = remoteStream.current
      remoteVideo.current.play().catch(() => {})
    }
    if (remoteAudio.current && remoteStream.current) {
      remoteAudio.current.srcObject = remoteStream.current
      remoteAudio.current.play().catch(() => {}) // autoplay peu fiable après srcObject
    }
    if (localVideo.current && localStream.current) localVideo.current.srcObject = localStream.current
  }, [status, callKind])

  // Compteur de durée d'appel (démarre à la connexion).
  useEffect(() => {
    if (status !== 'connected') return
    durationRef.current = 0
    setDuration(0)
    const t = setInterval(() => {
      durationRef.current += 1
      setDuration(durationRef.current)
    }, 1000)
    return () => clearInterval(t)
  }, [status])

  // Sonnerie 30 s max : si personne ne décroche, l'appel se coupe tout seul.
  useEffect(() => {
    if (status !== 'outgoing' && status !== 'incoming') return
    const t = setTimeout(() => cleanup(), 30_000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Ouvre (une seule fois, sans course) le canal d'émission vers le pair.
  function ensureOut(peerId: string): Promise<RealtimeChannel> {
    if (out.current && out.current.id === peerId) return Promise.resolve(out.current.ch)
    if (outPromise.current) return outPromise.current
    outPromise.current = (async () => {
      if (out.current) supabase!.removeChannel(out.current.ch)
      const ch = supabase!.channel('call-inbox:' + peerId, { config: { broadcast: { self: false } } })
      await new Promise<void>((resolve) => ch.subscribe((st) => st === 'SUBSCRIBED' && resolve()))
      out.current = { ch, id: peerId }
      outPromise.current = null
      return ch
    })()
    return outPromise.current
  }

  async function signal(peerId: string, payload: Omit<SignalPayload, 'from'>) {
    const ch = await ensureOut(peerId)
    await ch.send({ type: 'broadcast', event: 'signal', payload: { ...payload, from: me!.id } })
  }

  function newPc(peerId: string) {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    remoteStream.current = new MediaStream()
    pc.onicecandidate = (e) => {
      if (e.candidate) signal(peerId, { kind: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remoteStream.current!.addTrack(t))
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = remoteStream.current
        remoteVideo.current.play().catch(() => {})
      }
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream.current
        remoteAudio.current.play().catch(() => {})
      }
    }
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      if (s === 'connected') {
        connectedRef.current = true
        setStatus('connected')
      } else if (s === 'failed' || s === 'closed') {
        cleanup()
      }
      // 'disconnected' = coupure réseau temporaire → on laisse une chance de récupérer
    }
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' && roleRef.current === 'caller') {
        reoffer(peerId) // redémarrage ICE (négocie de nouveaux chemins, TURN inclus)
      }
    }
    pcRef.current = pc
    return pc
  }

  async function getMedia(kind: CallKind) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video' ? { facingMode: 'user' } : false,
    })
    localStream.current = stream
    curVideoTrack.current = stream.getVideoTracks()[0] ?? null
    if (localVideo.current) localVideo.current.srcObject = stream
    return stream
  }

  // ── Caméra : avant / arrière / double (composée sur un canvas) ──
  function stopCamStreams() {
    camStreams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    camStreams.current = []
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  async function openCam(facing: 'user' | 'environment'): Promise<MediaStream> {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
    camStreams.current.push(s)
    return s
  }

  function hiddenVideo(stream: MediaStream): HTMLVideoElement {
    const v = document.createElement('video')
    v.srcObject = stream
    v.muted = true
    v.playsInline = true
    return v
  }

  function drawCover(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, x: number, y: number, w: number, h: number) {
    const vw = v.videoWidth || 1
    const vh = v.videoHeight || 1
    const scale = Math.max(w / vw, h / vh)
    const dw = vw * scale
    const dh = vh * scale
    ctx.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  }

  async function buildVideoStream(mode: 'front' | 'back' | 'dual'): Promise<MediaStream> {
    stopCamStreams()
    if (mode !== 'dual') {
      return openCam(mode === 'back' ? 'environment' : 'user')
    }
    const front = await openCam('user')
    let back: MediaStream | null = null
    try {
      back = await openCam('environment')
    } catch {
      back = null
    }
    if (!back) return front // une seule caméra dispo → on retombe sur l'avant
    const fv = hiddenVideo(front)
    const bv = hiddenVideo(back)
    await Promise.all([fv.play().catch(() => {}), bv.play().catch(() => {})])
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    canvas.width = 720
    canvas.height = 1280
    const ctx = canvas.getContext('2d')
    if (!ctx) return front
    const loop = () => {
      const main = dualSwapRef.current ? bv : fv
      const pip = dualSwapRef.current ? fv : bv
      drawCover(ctx, main, 0, 0, canvas.width, canvas.height)
      const pw = Math.round(canvas.width * 0.33)
      const ph = Math.round(canvas.height * 0.33)
      const px = canvas.width - pw - 18
      const py = canvas.height - ph - 18
      ctx.save()
      ctx.beginPath()
      ctx.rect(px, py, pw, ph)
      ctx.clip()
      drawCover(ctx, pip, px, py, pw, ph)
      ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 4
      ctx.strokeRect(px, py, pw, ph)
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return canvas.captureStream(30)
  }

  async function switchCamera(mode: 'front' | 'back' | 'dual') {
    if (callKind !== 'video' || status !== 'connected') return
    const old = curVideoTrack.current
    if (old) old.stop() // libère la caméra courante (appareils mono-caméra)
    try {
      const stream = await buildVideoStream(mode)
      const track = stream.getVideoTracks()[0]
      if (!track) return
      curVideoTrack.current = track
      track.enabled = !cameraOff // respecte l'état "caméra éteinte"
      if (videoSender.current) await videoSender.current.replaceTrack(track)
      if (localVideo.current) localVideo.current.srcObject = stream
      setCameraMode(mode === 'dual' && camStreams.current.length < 2 ? 'front' : mode)
    } catch {
      try {
        const fb = await buildVideoStream('front')
        const t = fb.getVideoTracks()[0]
        if (t) {
          curVideoTrack.current = t
          if (videoSender.current) await videoSender.current.replaceTrack(t)
          if (localVideo.current) localVideo.current.srcObject = fb
          setCameraMode('front')
        }
      } catch {
        /* ignore */
      }
    }
  }

  const cycleCamera = () => switchCamera(cameraMode === 'front' ? 'back' : 'front')
  const toggleDual = () => switchCamera(cameraMode === 'dual' ? 'front' : 'dual')
  const swapDual = () => {
    dualSwapRef.current = !dualSwapRef.current
  }

  // Au démarrage : un appel a-t-il été déposé pendant que l'app était fermée ?
  async function checkPending() {
    if (!available || !me || status !== 'idle') return
    try {
      const { data } = await supabase!
        .from('pending_calls')
        .select('*')
        .eq('to_user', me.id)
        .maybeSingle()
      if (!data) return
      const age = Date.now() - new Date(data.created_at).getTime()
      if (age > 90_000) {
        await supabase!.from('pending_calls').delete().eq('to_user', me.id)
        return
      }
      offerRef.current = data.offer as RTCSessionDescriptionInit
      pendingKey.current = me.id
      roleRef.current = 'callee'
      connectedRef.current = false
      setPeer({ id: data.from_user, name: data.from_name, avatar: data.from_avatar })
      setCallKind((data.call_kind as CallKind) ?? 'audio')
      setStatus('incoming')
      haptic([30, 120, 30, 120])
    } catch {
      /* ignore */
    }
  }

  async function startCall(target: Profile, kind: CallKind) {
    if (!available || status !== 'idle') return
    try {
      setPeer({ id: target.id, name: target.display_name, avatar: target.avatar_url })
      setCallKind(kind)
      setMuted(false)
      setCameraMode('front')
      roleRef.current = 'caller'
      connectedRef.current = false
      declinedRef.current = false
      setStatus('outgoing')
      await ensureOut(target.id) // canal prêt AVANT toute signalisation
      const pc = newPc(target.id)
      const stream = await getMedia(kind)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      videoSender.current = pc.getSenders().find((s) => s.track?.kind === 'video') ?? null
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await signal(target.id, {
        kind: 'invite',
        callKind: kind,
        name: me!.display_name,
        avatar: me!.avatar_url,
        sdp: offer,
      })
      // Notif push : fait sonner/notifier même si l'app du destinataire est fermée.
      notifyUser(
        target.id,
        `${me!.display_name} t'appelle`,
        kind === 'video' ? '📹 Appel vidéo entrant' : '📞 Appel audio entrant',
        '/app',
        'call',
      )
      // Persiste l'invitation : le destinataire pourra rejoindre en ouvrant l'app.
      pendingKey.current = target.id
      supabase!
        .from('pending_calls')
        .upsert(
          {
            to_user: target.id,
            from_user: me!.id,
            from_name: me!.display_name,
            from_avatar: me!.avatar_url,
            call_kind: kind,
            offer,
          },
          { onConflict: 'to_user' },
        )
        .then(
          () => {},
          () => {},
        )
    } catch {
      cleanup()
    }
  }

  async function onSignal(p: SignalPayload) {
    if (!me) return
    if (p.kind === 'invite') {
      if (status !== 'idle') {
        await signal(p.from, { kind: 'decline' })
        return
      }
      offerRef.current = p.sdp ?? null
      pendingKey.current = me.id
      roleRef.current = 'callee'
      connectedRef.current = false
      setPeer({ id: p.from, name: p.name ?? 'Appel', avatar: p.avatar ?? null })
      setCallKind(p.callKind ?? 'audio')
      setStatus('incoming')
      haptic([30, 120, 30, 120])
    } else if (p.kind === 'answer') {
      if (pcRef.current && p.sdp) {
        await pcRef.current.setRemoteDescription(p.sdp)
        await flushIce()
        // Le destinataire a DÉCROCHÉ → on passe « connecté » immédiatement :
        // la sonnerie s'arrête tout de suite (comme WhatsApp), sans attendre l'ICE.
        connectedRef.current = true
        setStatus('connected')
      }
    } else if (p.kind === 'ice') {
      if (p.candidate) {
        if (pcRef.current?.remoteDescription) {
          try { await pcRef.current.addIceCandidate(p.candidate) } catch { /* ignore */ }
        } else {
          pendingIce.current.push(p.candidate)
        }
      }
    } else if (p.kind === 'switch') {
      const pc = pcRef.current
      if (!pc) return
      if (p.callKind === 'video' && p.sdp) {
        await pc.setRemoteDescription(p.sdp)
        try {
          const stream = await buildVideoStream('front')
          const track = stream.getVideoTracks()[0]
          if (track) {
            curVideoTrack.current = track
            track.enabled = true
            if (videoSender.current) await videoSender.current.replaceTrack(track)
            else videoSender.current = pc.addTrack(track, stream)
            if (localVideo.current) localVideo.current.srcObject = stream
            setCameraMode('front')
            setCameraOff(false)
          }
        } catch {
          /* pas de caméra : on reçoit la vidéo sans en envoyer */
        }
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await signal(p.from, { kind: 'switch-answer', sdp: answer })
        setCallKind('video')
      } else if (p.callKind === 'audio') {
        if (videoSender.current) await videoSender.current.replaceTrack(null)
        curVideoTrack.current?.stop()
        curVideoTrack.current = null
        stopCamStreams()
        setCallKind('audio')
      }
    } else if (p.kind === 'switch-answer') {
      if (pcRef.current && p.sdp) await pcRef.current.setRemoteDescription(p.sdp)
    } else if (p.kind === 'reoffer') {
      if (pcRef.current && p.sdp) {
        await pcRef.current.setRemoteDescription(p.sdp)
        await flushIce()
        const answer = await pcRef.current.createAnswer()
        await pcRef.current.setLocalDescription(answer)
        await signal(p.from, { kind: 'reanswer', sdp: answer })
      }
    } else if (p.kind === 'reanswer') {
      if (pcRef.current && p.sdp) {
        await pcRef.current.setRemoteDescription(p.sdp)
        await flushIce()
      }
    } else if (p.kind === 'chat') {
      if (p.text) setChatMsgs((m) => [...m, { from: 'them', text: p.text! }])
    } else if (p.kind === 'hangup' || p.kind === 'decline') {
      if (p.kind === 'decline') declinedRef.current = true
      cleanup()
    }
  }

  // ── Message écrit pendant l'appel ─────────────────────────────────
  function sendCallChat(text: string) {
    const t = text.trim()
    if (!t || !peer) return
    setChatMsgs((m) => [...m, { from: 'me', text: t }])
    signal(peer.id, { kind: 'chat', text: t })
  }

  // ── Enregistrement de l'appel → galerie privée ────────────────────
  function startCallRecording() {
    if (recording) return
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ac = new AC()
      audioCtxRef.current = ac
      const dest = ac.createMediaStreamDestination()
      // Mixe la voix locale + la voix distante dans une seule piste audio.
      const localA = localStream.current?.getAudioTracks() ?? []
      if (localA.length) ac.createMediaStreamSource(new MediaStream(localA)).connect(dest)
      const remoteA = remoteStream.current?.getAudioTracks() ?? []
      if (remoteA.length) ac.createMediaStreamSource(new MediaStream(remoteA)).connect(dest)

      const isVid = callKind === 'video'
      const tracks: MediaStreamTrack[] = [...dest.stream.getAudioTracks()]
      if (isVid) {
        const vt = remoteStream.current?.getVideoTracks()[0]
        if (vt) tracks.push(vt) // on enregistre la vidéo du correspondant
      }
      const mixed = new MediaStream(tracks)
      const mime = isVid
        ? MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = mime ? new MediaRecorder(mixed, { mimeType: mime }) : new MediaRecorder(mixed)
      recChunks.current = []
      recPeerRef.current = peer?.name ?? ''
      rec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.current.push(e.data) }
      rec.onstop = async () => {
        audioCtxRef.current?.close().catch(() => {})
        audioCtxRef.current = null
        const blob = new Blob(recChunks.current, { type: isVid ? 'video/webm' : 'audio/webm' })
        recChunks.current = []
        if (!blob.size || !me) return
        try {
          const ext = isVid ? 'webm' : 'weba'
          const file = new File([blob], `appel-${Date.now()}.${ext}`, { type: isVid ? 'video/webm' : 'audio/webm' })
          const url = await uploadMedia(file, me.id)
          await saveToGallery({ url, kind: isVid ? 'video' : 'audio', source: `Appel avec ${recPeerRef.current}` })
        } catch {
          /* upload échoué : on ne casse rien */
        }
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
      haptic(20)
    } catch {
      /* enregistrement non supporté */
    }
  }

  function stopCallRecording() {
    setRecording(false)
    try {
      recRef.current?.stop()
    } catch {
      /* déjà arrêté */
    }
    recRef.current = null
  }

  async function flushIce() {
    for (const c of pendingIce.current) {
      try { await pcRef.current?.addIceCandidate(c) } catch { /* ignore */ }
    }
    pendingIce.current = []
  }

  // Redémarrage ICE (appel de l'appelant) quand la connexion échoue.
  async function reoffer(peerId: string) {
    const pc = pcRef.current
    if (!pc) return
    try {
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      await signal(peerId, { kind: 'reoffer', sdp: offer })
    } catch {
      /* ignore */
    }
  }

  async function accept() {
    if (!peer || !offerRef.current) return
    try {
      await ensureOut(peer.id) // canal prêt AVANT d'envoyer la réponse
      const pc = newPc(peer.id)
      const stream = await getMedia(callKind)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      videoSender.current = pc.getSenders().find((s) => s.track?.kind === 'video') ?? null
      setCameraMode('front')
      await pc.setRemoteDescription(offerRef.current)
      await flushIce()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await signal(peer.id, { kind: 'answer', sdp: answer })
      connectedRef.current = true
      setStatus('connected')
    } catch {
      cleanup()
    }
  }

  function decline() {
    if (peer) signal(peer.id, { kind: 'decline' })
    cleanup()
  }

  function hangup() {
    if (peer) signal(peer.id, { kind: 'hangup' })
    cleanup()
  }

  function cleanup() {
    // Fin d'appel côté APPELANT : notif "appel manqué" si jamais connecté ni
    // refusé, + push d'annulation pour fermer la notif d'appel chez le destinataire.
    if (roleRef.current === 'caller' && pendingKey.current && me) {
      const callee = pendingKey.current
      const st = connectedRef.current ? 'answered' : declinedRef.current ? 'declined' : 'missed'
      if (st === 'missed') {
        recordNotification(callee, 'call', 'Appel manqué', `Appel manqué de ${me.display_name}`, {
          image: me.avatar_url,
          actorId: me.id,
          actorName: me.display_name,
        })
      }
      notifyUser(callee, 'Appel terminé', '', '/app', 'call', { cancel: true })
      recordCall({
        caller: me.id,
        callee,
        callerName: me.display_name,
        callerAvatar: me.avatar_url ?? null,
        calleeName: peer?.name ?? '',
        calleeAvatar: peer?.avatar ?? null,
        kind: callKind,
        status: st,
        duration: durationRef.current,
      })
      // Trace de l'appel DANS la conversation (façon WhatsApp) : un message
      // d'appel posté une seule fois (côté appelant) → visible pour les deux.
      const info = { kind: callKind as 'audio' | 'video', status: st as 'answered' | 'missed' | 'declined', duration: durationRef.current }
      const room = dmRoomId(me.id, callee)
      sendRoomMessage(room, encodeCall(info), null, me).catch(() => {})
      touchDmThread(room, callee, callPreview(info)).catch(() => {})
    }
    pcRef.current?.close()
    pcRef.current = null
    localStream.current?.getTracks().forEach((t) => t.stop())
    localStream.current = null
    remoteStream.current = null
    pendingIce.current = []
    offerRef.current = null
    if (out.current) {
      supabase!.removeChannel(out.current.ch)
      out.current = null
    }
    outPromise.current = null
    if (pendingKey.current && supabase) {
      supabase.from('pending_calls').delete().eq('to_user', pendingKey.current).then(
        () => {},
        () => {},
      )
      pendingKey.current = null
    }
    // Si on enregistrait encore, on stoppe → le vocal/vidéo se sauve dans la galerie.
    if (recRef.current) {
      try { recRef.current.stop() } catch { /* ignore */ }
      recRef.current = null
    }
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    setRecording(false)
    setChatMsgs([])
    stopCamStreams()
    curVideoTrack.current?.stop()
    curVideoTrack.current = null
    videoSender.current = null
    durationRef.current = 0
    dualSwapRef.current = false
    roleRef.current = null
    connectedRef.current = false
    declinedRef.current = false
    setStatus('idle')
    setPeer(null)
    setMuted(false)
    setDuration(0)
    setCameraMode('front')
    setCameraOff(false)
  }

  function toggleMute() {
    const next = !muted
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
    setMuted(next)
  }

  function toggleCamera() {
    const next = !cameraOff
    if (curVideoTrack.current) curVideoTrack.current.enabled = !next
    setCameraOff(next)
  }

  // Bascule audio ⇄ vidéo en cours d'appel (renégociation WebRTC).
  async function switchToKind(target: CallKind) {
    const pc = pcRef.current
    if (status !== 'connected' || !pc || !peer || target === callKind) return
    try {
      if (target === 'video') {
        const stream = await buildVideoStream('front')
        const track = stream.getVideoTracks()[0]
        if (!track) return
        curVideoTrack.current = track
        track.enabled = true
        if (videoSender.current) await videoSender.current.replaceTrack(track)
        else videoSender.current = pc.addTrack(track, stream)
        if (localVideo.current) localVideo.current.srcObject = stream
        setCameraMode('front')
        setCameraOff(false)
        setCallKind('video')
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await signal(peer.id, { kind: 'switch', callKind: 'video', sdp: offer })
      } else {
        if (videoSender.current) await videoSender.current.replaceTrack(null)
        curVideoTrack.current?.stop()
        curVideoTrack.current = null
        stopCamStreams()
        setCallKind('audio')
        await signal(peer.id, { kind: 'switch', callKind: 'audio' })
      }
    } catch {
      /* ignore */
    }
  }

  const switchKind = () => switchToKind(callKind === 'video' ? 'audio' : 'video')

  return (
    <Ctx.Provider value={{ startCall, available }}>
      {children}
      {status !== 'idle' && peer && (
        <CallOverlay
          status={status}
          peer={peer}
          kind={callKind}
          muted={muted}
          duration={duration}
          cameraMode={cameraMode}
          cameraOff={cameraOff}
          localVideo={localVideo}
          remoteVideo={remoteVideo}
          remoteAudio={remoteAudio}
          onAccept={accept}
          onDecline={decline}
          onHangup={hangup}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onCycleCamera={cycleCamera}
          onToggleDual={toggleDual}
          onSwapDual={swapDual}
          onSwitchKind={switchKind}
          chatMsgs={chatMsgs}
          onSendChat={sendCallChat}
          recording={recording}
          onToggleRecord={() => (recording ? stopCallRecording() : startCallRecording())}
        />
      )}
    </Ctx.Provider>
  )
}

function CallOpt({ icon: Icon, label, onClick }: { icon: typeof Phone; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-white active:bg-white/5">
      <Icon className="h-5 w-5 text-gold" />
      <span className="font-semibold">{label}</span>
    </button>
  )
}

function CallOverlay({
  status,
  peer,
  kind,
  muted,
  duration,
  cameraMode,
  cameraOff,
  localVideo,
  remoteVideo,
  remoteAudio,
  onAccept,
  onDecline,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onCycleCamera,
  onToggleDual,
  onSwapDual,
  onSwitchKind,
  chatMsgs,
  onSendChat,
  recording,
  onToggleRecord,
}: {
  status: Status
  peer: { id: string; name: string; avatar: string | null }
  kind: CallKind
  muted: boolean
  duration: number
  cameraMode: 'front' | 'back' | 'dual'
  cameraOff: boolean
  localVideo: RefObject<HTMLVideoElement>
  remoteVideo: RefObject<HTMLVideoElement>
  remoteAudio: RefObject<HTMLAudioElement>
  onAccept: () => void
  onDecline: () => void
  onHangup: () => void
  onToggleMute: () => void
  onToggleCamera: () => void
  onCycleCamera: () => void
  onToggleDual: () => void
  onSwapDual: () => void
  onSwitchKind: () => void
  chatMsgs: CallChatMsg[]
  onSendChat: (text: string) => void
  recording: boolean
  onToggleRecord: () => void
}) {
  const [opt, setOpt] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatDraft, setChatDraft] = useState('')
  const label =
    status === 'incoming'
      ? `Appel ${kind === 'video' ? 'vidéo' : 'audio'} entrant…`
      : status === 'outgoing'
        ? 'Appel en cours…'
        : fmtDur(duration)

  const videoConnected = kind === 'video' && status === 'connected'

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink-900">
      {recording && (
        <div className="safe-top absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-flex-pink/90 px-3 py-1 text-xs font-bold text-white">
          <Circle className="h-2.5 w-2.5 animate-pulse fill-current" /> REC
        </div>
      )}
      {videoConnected ? (
        <>
          <video ref={remoteVideo} data-call autoPlay playsInline muted className="absolute inset-0 h-full w-full bg-black object-cover" />
          <video
            ref={localVideo}
            data-call
            autoPlay
            playsInline
            muted
            className="absolute right-4 top-8 h-44 w-32 rounded-2xl border border-white/20 bg-black object-cover shadow-card"
          />
          <div className="safe-top absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-ink-900/60 px-4 py-1.5 text-sm font-bold text-white backdrop-blur">
            {fmtDur(duration)}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <Avatar name={peer.name} url={peer.avatar} size={128} ring />
          <div className="text-2xl font-bold text-white">{peer.name}</div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
            {label}
          </div>
        </div>
      )}
      {/* Audio distant TOUJOURS monté (appels audio ET vidéo) → son fiable,
          jamais coupé par le changement d'état/branche. La vidéo distante est
          muette : tout le son sort d'ici. */}
      <audio ref={remoteAudio} data-call autoPlay playsInline />

      <div className="relative z-10 mt-auto flex items-center justify-center gap-8 pb-14 pt-6">
        {status === 'incoming' ? (
          <>
            <button onClick={onDecline} className="grid h-16 w-16 place-items-center rounded-full bg-flex-pink text-white shadow-glow active:scale-90">
              <PhoneOff className="h-7 w-7" />
            </button>
            <button onClick={onAccept} className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-glow active:scale-90">
              <Phone className="h-7 w-7" />
            </button>
          </>
        ) : (
          <>
            <button onClick={onToggleMute} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white active:scale-90">
              {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            {status === 'connected' && (
              <button onClick={() => setChatOpen(true)} className="relative grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white active:scale-90" aria-label="Message">
                <MessageSquare className="h-6 w-6" />
                {chatMsgs.length > 0 && !chatOpen && (
                  <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-flex-pink px-1 text-[10px] font-bold">
                    {chatMsgs.length}
                  </span>
                )}
              </button>
            )}
            {status === 'connected' && (
              <button onClick={onToggleRecord} className={`grid h-14 w-14 place-items-center rounded-full text-white active:scale-90 ${recording ? 'bg-flex-pink' : 'bg-white/10'}`} aria-label="Enregistrer l'appel">
                <Circle className={`h-6 w-6 ${recording ? 'fill-current' : ''}`} />
              </button>
            )}
            {(kind === 'video' || status === 'connected') && (
              <button onClick={() => setOpt(true)} className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white active:scale-90">
                <MoreHorizontal className="h-6 w-6" />
              </button>
            )}
            <button onClick={onHangup} className="grid h-16 w-16 place-items-center rounded-full bg-flex-pink text-white shadow-glow active:scale-90">
              <PhoneOff className="h-7 w-7" />
            </button>
          </>
        )}
      </div>

      {opt && (
        <div className="fixed inset-0 z-[95] flex items-end bg-ink-900/70 backdrop-blur-sm" onClick={() => setOpt(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass mx-auto w-full max-w-lg rounded-t-3xl p-4 pb-10">
            <div className="mb-2 px-2 text-sm font-bold uppercase tracking-wider text-zinc-400">Options de l'appel</div>
            {kind === 'video' && (
              <CallOpt icon={cameraOff ? VideoOff : Video} label={cameraOff ? 'Activer la caméra' : 'Couper la caméra'} onClick={() => { onToggleCamera(); setOpt(false) }} />
            )}
            {kind === 'video' && status === 'connected' && (
              <CallOpt icon={SwitchCamera} label="Changer de caméra (avant/arrière)" onClick={() => { onCycleCamera(); setOpt(false) }} />
            )}
            {kind === 'video' && status === 'connected' && (
              <CallOpt icon={Layers} label={cameraMode === 'dual' ? 'Désactiver les 2 caméras' : 'Activer les 2 caméras'} onClick={() => { onToggleDual(); setOpt(false) }} />
            )}
            {kind === 'video' && cameraMode === 'dual' && (
              <CallOpt icon={RefreshCw} label="Inverser les caméras" onClick={() => { onSwapDual(); setOpt(false) }} />
            )}
            {status === 'connected' && (
              <CallOpt icon={kind === 'video' ? Phone : Video} label={kind === 'video' ? 'Passer en appel audio' : 'Passer en appel vidéo'} onClick={() => { onSwitchKind(); setOpt(false) }} />
            )}
          </div>
        </div>
      )}

      {/* Messagerie pendant l'appel */}
      {chatOpen && (
        <div className="absolute inset-0 z-[96] flex flex-col bg-ink-900/85 backdrop-blur-sm">
          <div className="safe-top flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="font-display text-lg font-bold text-white">Messages · {peer.name}</div>
            <button onClick={() => setChatOpen(false)} className="ml-auto text-zinc-400">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {chatMsgs.length === 0 && (
              <p className="mt-10 text-center text-sm text-zinc-500">Écris pendant l'appel — visible par ton correspondant.</p>
            )}
            {chatMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] ${m.from === 'me' ? 'bg-gold-grad text-ink-900' : 'glass text-zinc-100'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="safe-bottom flex items-center gap-2 border-t border-white/10 px-3 pt-2">
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatDraft.trim()) {
                  onSendChat(chatDraft)
                  setChatDraft('')
                }
              }}
              placeholder="Message…"
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
            />
            <button
              onClick={() => { if (chatDraft.trim()) { onSendChat(chatDraft); setChatDraft('') } }}
              disabled={!chatDraft.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-grad text-ink-900 active:scale-90 disabled:opacity-30"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
