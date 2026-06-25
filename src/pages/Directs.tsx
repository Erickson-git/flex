import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Archive, BellOff, Loader2, Pin, Plus, Search, X } from 'lucide-react'
import type { DirectThread, Profile } from '@/lib/types'
import { fetchThreads, subscribeThreads, unreadCount } from '@/lib/api'
import { onPresence } from '@/lib/globalPresence'
import { searchProfiles, type SearchResult } from '@/lib/groupCall'
import { fetchActiveStories, groupStories, type Story } from '@/lib/stories'
import { isArchived, isMuted, isPinned, toggleArchive, toggleMute, togglePin } from '@/lib/chatPrefs'
import { useAuth } from '@/store/useAuth'
import { Avatar } from '@/components/Avatar'
import { StoryViewer } from '@/components/StoryViewer'
import { AddStatus } from '@/components/AddStatus'
import { cn, dmRoomId, haptic, timeAgo } from '@/lib/utils'

function lastReadMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('flex.read') || '{}')
  } catch {
    return {}
  }
}
function markRead(roomId: string) {
  try {
    const m = lastReadMap()
    m[roomId] = Date.now()
    localStorage.setItem('flex.read', JSON.stringify(m))
  } catch {
    /* quota */
  }
}

export default function Directs() {
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const [threads, setThreads] = useState<DirectThread[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [viewer, setViewer] = useState<Story[] | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [menuThread, setMenuThread] = useState<DirectThread | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [, setTick] = useState(0) // force le re-rendu après épingler/sourdine/archiver
  const pressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)

  function startPress(t: DirectThread) {
    longPressed.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      haptic(20)
      setMenuThread(t)
    }, 500)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const [online, setOnline] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const load = () => fetchThreads().then(setThreads).catch(() => {})
    load().finally(() => setLoading(false))
    fetchActiveStories().then(setStories).catch(() => {})
    const unsub = subscribeThreads(load) // mise à jour temps réel de la liste
    return unsub
  }, [])

  // Présence en ligne (point vert).
  useEffect(() => onPresence(setOnline), [])

  // Nombre de messages non lus par conversation (façon WhatsApp).
  useEffect(() => {
    if (!me) return
    const r = lastReadMap()
    const unreadThreads = threads.filter(
      (t) => t.last_sender && t.last_sender !== me.id && new Date(t.last_at).getTime() > (r[t.id] || 0),
    )
    if (!unreadThreads.length) {
      setCounts({})
      return
    }
    let cancelled = false
    Promise.all(
      unreadThreads.map(async (t) => {
        const n = await unreadCount(t.id, new Date(r[t.id] || 0).toISOString(), me.id).catch(() => 0)
        return [t.id, n] as const
      }),
    ).then((pairs) => {
      if (!cancelled) setCounts(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [threads, me?.id])

  const reads = lastReadMap()

  const refetchStories = () => fetchActiveStories().then(setStories).catch(() => {})
  const groups = groupStories(stories)
  const myGroup = groups.find((g) => g.author_id === me?.id)
  const contactIds = new Set(threads.map((t) => t.peer.id))
  const contactGroups = groups.filter((g) => g.author_id !== me?.id && contactIds.has(g.author_id))

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 2) {
        setResults([])
        return
      }
      searchProfiles(q).then((r) => setResults(r.filter((x) => x.id !== me?.id))).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [q, me?.id])

  function openWith(p: SearchResult) {
    if (!me) return
    haptic(8)
    const roomId = dmRoomId(me.id, p.id)
    const thread: DirectThread = {
      id: roomId,
      peer: { id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url } as unknown as Profile,
      last_message: '',
      last_at: new Date().toISOString(),
      unread: 0,
    }
    navigate(`/app/directs/${roomId}`, { state: thread })
  }

  const searching = q.trim().length >= 2

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 bg-ink-900/85 px-5 pb-2 pt-2 backdrop-blur-xl">
        <h1 className="font-display text-3xl font-extrabold">
          <span className="text-gold-grad">Chat</span>
        </h1>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
          <Search className="h-5 w-5 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un pseudo…"
            className="w-full bg-transparent py-3 text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </header>

      {searching ? (
        <div className="px-3 pt-3">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-600">Aucun profil trouvé.</div>
          ) : (
            results.map((r) => (
              <button key={r.id} onClick={() => openWith(r)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-white/5">
                <Avatar name={r.display_name} url={r.avatar_url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{r.display_name}</div>
                  <div className="text-sm text-zinc-500">@{r.username}</div>
                </div>
                <span className="shrink-0 rounded-full bg-gold-grad px-3 py-1.5 text-xs font-bold text-ink-900">Écrire</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Statuts (stories 24 h) */}
          <div className="flex gap-3 overflow-x-auto px-4 py-3">
            <div className="flex w-16 shrink-0 flex-col items-center gap-1">
              <button onClick={() => (myGroup ? setViewer(myGroup.stories) : setShowAdd(true))} className="relative">
                <Avatar name={me?.display_name ?? 'Moi'} url={me?.avatar_url ?? null} size={56} ring={!!myGroup} ringClass="ring-2 ring-gold ring-offset-2 ring-offset-ink-900" />
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); setShowAdd(true) }}
                  className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-gold-grad text-ink-900 ring-2 ring-ink-900"
                >
                  <Plus className="h-3 w-3" strokeWidth={3} />
                </span>
              </button>
              <span className="text-[11px] text-zinc-400">Ton statut</span>
            </div>
            {contactGroups.map((g) => (
              <button key={g.author_id} onClick={() => setViewer(g.stories)} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <Avatar name={g.author?.display_name ?? '?'} url={g.author?.avatar_url ?? null} size={56} ring ringClass="ring-2 ring-flex-cyan ring-offset-2 ring-offset-ink-900" />
                <span className="w-full truncate text-center text-[11px] text-zinc-400">{g.author?.display_name}</span>
              </button>
            ))}
          </div>

          {/* Conversations */}
          <div className="px-3 pt-1">
            {loading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
            ) : threads.length === 0 ? (
              <div className="py-14 text-center text-sm text-zinc-600">Aucune conversation. Recherche un pseudo pour démarrer ✦</div>
            ) : (
              <>
              {!showArchived && threads.some((t) => isArchived(t.id)) && (
                <button onClick={() => setShowArchived(true)} className="mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-zinc-300 active:bg-white/5">
                  <Archive className="h-5 w-5 text-zinc-500" />
                  <span className="font-semibold">Archivées</span>
                  <span className="ml-auto text-xs text-zinc-500">{threads.filter((t) => isArchived(t.id)).length}</span>
                </button>
              )}
              {showArchived && (
                <button onClick={() => setShowArchived(false)} className="mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-gold active:bg-white/5">
                  ← Conversations
                </button>
              )}
              {[...threads]
                .filter((t) => isArchived(t.id) === showArchived)
                .sort((a, b) => Number(isPinned(b.id)) - Number(isPinned(a.id)))
                .map((t, i) => {
                const unread = !!t.last_sender && t.last_sender !== me?.id && new Date(t.last_at).getTime() > (reads[t.id] || 0)
                const preview = (t.last_sender === me?.id ? 'Toi : ' : '') + (t.last_message || '')
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    onMouseDown={() => startPress(t)}
                    onMouseUp={endPress}
                    onMouseLeave={endPress}
                    onTouchStart={() => startPress(t)}
                    onTouchEnd={endPress}
                    onClick={() => {
                      if (longPressed.current) { longPressed.current = false; return }
                      haptic(8)
                      markRead(t.id)
                      navigate(`/app/directs/${t.id}`, { state: t })
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-white/5"
                  >
                    <div className="relative shrink-0">
                      <Avatar name={t.peer.display_name} url={t.peer.avatar_url} size={54} ring={unread} />
                      {online.has(t.peer.id) && (
                        <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isPinned(t.id) && <Pin className="h-3.5 w-3.5 shrink-0 text-gold" />}
                        <span className={cn('truncate', unread ? 'font-bold text-white' : 'font-semibold text-white')}>{t.peer.display_name}</span>
                        {isMuted(t.id) && <BellOff className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}
                      </div>
                      <div className={cn('truncate text-sm', unread ? 'font-semibold text-zinc-200' : 'text-zinc-400')}>{preview}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn('text-[11px]', unread ? 'font-semibold text-emerald-400' : 'text-zinc-600')}>{timeAgo(t.last_at)}</span>
                      {unread && !isMuted(t.id) && (
                        counts[t.id] ? (
                          <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-ink-900">
                            {counts[t.id] > 99 ? '99+' : counts[t.id]}
                          </span>
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        )
                      )}
                    </div>
                  </motion.button>
                )
              })}
              </>
            )}
          </div>
        </>
      )}

      {/* Menu conversation (appui long) : épingler / sourdine */}
      {menuThread && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={() => setMenuThread(null)}>
          <div onClick={(e) => e.stopPropagation()} className="safe-bottom w-full max-w-md rounded-t-3xl border-t border-white/10 bg-ink-800/95 p-4 backdrop-blur-xl sm:rounded-3xl sm:border">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="truncate font-display text-lg font-extrabold">{menuThread.peer.display_name}</span>
              <button onClick={() => setMenuThread(null)} className="text-zinc-500"><X className="h-6 w-6" /></button>
            </div>
            <button
              onClick={() => { togglePin(menuThread.id); setMenuThread(null); setTick((n) => n + 1) }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left active:bg-white/5"
            >
              <Pin className="h-5 w-5 text-gold" />
              <span className="font-semibold text-white">{isPinned(menuThread.id) ? 'Désépingler' : 'Épingler en haut'}</span>
            </button>
            <button
              onClick={() => { toggleMute(menuThread.id); setMenuThread(null); setTick((n) => n + 1) }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left active:bg-white/5"
            >
              <BellOff className="h-5 w-5 text-flex-cyan" />
              <span className="font-semibold text-white">{isMuted(menuThread.id) ? 'Réactiver les notifications' : 'Mettre en sourdine'}</span>
            </button>
            <button
              onClick={() => { toggleArchive(menuThread.id); setMenuThread(null); setTick((n) => n + 1) }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left active:bg-white/5"
            >
              <Archive className="h-5 w-5 text-zinc-400" />
              <span className="font-semibold text-white">{isArchived(menuThread.id) ? 'Désarchiver' : 'Archiver'}</span>
            </button>
          </div>
        </div>
      )}

      {viewer && <StoryViewer stories={viewer} onClose={() => setViewer(null)} onDeleted={refetchStories} />}
      {showAdd && <AddStatus onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); refetchStories() }} />}
    </div>
  )
}
