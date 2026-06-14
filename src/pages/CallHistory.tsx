import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Trash2, Video } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { clearCallLogs, fetchCallLogs, type CallLog } from '@/lib/calls'
import { useCall } from '@/components/CallProvider'
import { Avatar } from '@/components/Avatar'
import { cn, timeAgo } from '@/lib/utils'

const fmt = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '')

export default function CallHistory() {
  const navigate = useNavigate()
  const { startCall, available } = useCall()
  const [logs, setLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCallLogs()
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  async function clear() {
    if (!window.confirm("Effacer tout l'historique d'appels ?")) return
    await clearCallLogs()
    setLogs([])
  }

  function call(l: CallLog, kind: 'audio' | 'video') {
    if (!l.peer_id) return
    const target = { id: l.peer_id, display_name: l.peer_name ?? '', avatar_url: l.peer_avatar ?? null } as unknown as Profile
    startCall(target, kind)
  }

  return (
    <div className="mx-auto max-w-lg pb-16">
      <header className="safe-top flex items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <Phone className="h-5 w-5 text-gold" /> Appels
          </h1>
        </div>
        {logs.length > 0 && (
          <button onClick={clear} className="rounded-full p-2 text-zinc-500">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </header>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">Aucun appel pour l'instant.</div>
      ) : (
        <div className="space-y-1 px-3">
          {logs.map((l) => {
            const missed = l.status === 'missed' || l.status === 'declined'
            const Icon = l.status === 'missed' ? PhoneMissed : l.direction === 'in' ? PhoneIncoming : PhoneOutgoing
            const detail =
              l.status === 'missed'
                ? 'Manqué'
                : l.status === 'declined'
                  ? 'Refusé'
                  : fmt(l.duration_seconds) || 'Répondu'
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                <Avatar name={l.peer_name ?? '?'} url={l.peer_avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-sm font-bold', missed ? 'text-flex-pink' : 'text-white')}>
                    {l.peer_name || 'Inconnu'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Icon className={cn('h-3.5 w-3.5', missed && 'text-flex-pink')} />
                    {l.kind === 'video' ? 'Vidéo' : 'Audio'} · {detail} · {timeAgo(l.created_at)}
                  </div>
                </div>
                {available && l.peer_id && (
                  <div className="flex gap-2">
                    <button onClick={() => call(l, 'audio')} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-emerald-400 active:scale-90">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button onClick={() => call(l, 'video')} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-flex-cyan active:scale-90">
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
