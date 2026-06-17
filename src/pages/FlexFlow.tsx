import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Search as SearchIcon } from 'lucide-react'
import { fetchFlow, subscribeFlexes } from '@/lib/api'
import type { Flex } from '@/lib/types'
import { useAuth } from '@/store/useAuth'
import { BrandSheet } from '@/components/BrandSheet'
import { FlexCard } from '@/components/FlexCard'
import { LiveTicker } from '@/components/LiveTicker'
import { StoriesBar } from '@/components/StoriesBar'
import { StarBoostToast } from '@/components/StarBoostToast'
import { DailyCheckIn } from '@/components/DailyCheckIn'
import { SpotlightBanner, LossAversionBanner } from '@/components/EngagementBanners'
import { SparksChip } from '@/components/SparksChip'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Avatar } from '@/components/Avatar'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { sortTrending } from '@/lib/feedAlgorithm'
import { personalizeFeed } from '@/lib/engagement'
import { cn, haptic, prestigeFromScore, prestigeProgress } from '@/lib/utils'

const PAGE = 60

/** Fusionne deux listes de Flex sans doublon (par id), en gardant les plus récents. */
function mergeFlexes(a: Flex[], b: Flex[]): Flex[] {
  const map = new Map<string, Flex>()
  for (const f of a) map.set(f.id, f)
  for (const f of b) map.set(f.id, f)
  return [...map.values()]
}

export default function FlexFlow() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [flexes, setFlexes] = useState<Flex[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [tab, setTab] = useState<'foryou' | 'trends'>('foryou')
  const [appSheet, setAppSheet] = useState(false)

  const displayed = tab === 'trends' ? sortTrending(flexes) : personalizeFeed(flexes)
  const sentinelRef = useRef<HTMLDivElement>(null)

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const page = await fetchFlow(flexes.length, PAGE)
      setFlexes((prev) => mergeFlexes(prev, page))
      if (page.length < PAGE) setHasMore(false)
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false)
    }
  }

  // Nom « FLEX » : tap = fenêtre app/partage ; appui long (800 ms) = Ghost Mode (secret).
  const pressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const startPress = () => {
    longPressed.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      haptic([20, 40, 20])
      navigate('/ghost')
    }, 800)
  }
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }
  const onLogoClick = () => {
    if (longPressed.current) return // appui long → ne pas ouvrir la fenêtre
    haptic(8)
    setAppSheet(true)
  }

  useEffect(() => {
    let active = true
    // Première page + fusion des nouveautés temps réel (sans écraser les pages
    // déjà chargées en "voir plus").
    const load = () =>
      fetchFlow(0, PAGE)
        .then((f) => {
          if (!active) return
          setFlexes((prev) => (prev.length ? mergeFlexes(prev, f) : f))
          if (f.length < PAGE) setHasMore(false)
        })
        .catch(() => {})
    load().finally(() => active && setLoading(false))
    // Feed temps réel : un nouveau Flex publié par n'importe qui apparaît live.
    const unsub = subscribeFlexes(load)
    return () => {
      active = false
      unsub()
    }
  }, [])

  // Défilement infini : charge la page suivante quand on approche du bas.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore()
      },
      { rootMargin: '700px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, flexes.length])

  const prog = me ? prestigeProgress(me.flex_score) : 0
  const meta = me ? prestigeFromScore(me.flex_score) : null

  return (
    <div className="mx-auto max-w-lg pb-28">
      <StarBoostToast />

      <header className="safe-top sticky top-0 z-30 bg-ink-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h1
            onClick={onLogoClick}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            className="cursor-pointer select-none font-display text-3xl font-extrabold tracking-tight"
          >
            <span className="text-gold-grad">FLEX</span>
          </h1>
          {me && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => navigate('/app/search')} aria-label="Rechercher" className="grid h-9 w-9 place-items-center rounded-full text-zinc-300">
                <SearchIcon className="h-5 w-5" />
              </button>
              <SparksChip onClick={() => navigate('/app/market')} />
              <NotificationCenter />
              <button onClick={() => navigate('/app/me')}>
                <Avatar name={me.display_name} url={me.avatar_url} size={38} ring ringClass={`ring-2 ${meta?.ring} ring-offset-2 ring-offset-ink-900`} />
              </button>
            </div>
          )}
        </div>

        {/* Barre de progression de prestige */}
        {me && meta && (
          <div className="px-5 pb-2">
            <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
              <PrestigeBadge score={me.flex_score} size="sm" />
              <span>{Math.round(prog * 100)}% vers le palier suivant</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gold-grad"
                initial={{ width: 0 }}
                animate={{ width: `${prog * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <StoriesBar />
        <LiveTicker />
      </header>

      <LossAversionBanner />
      <SpotlightBanner />
      <DailyCheckIn />

      {/* Sélecteur de flux : Pour toi / Trends (moteur d'engagement) */}
      <div className="mx-4 mt-4 flex gap-2">
        {([['foryou', 'Pour toi'], ['trends', 'Trends 🔥']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              haptic(8)
              setTab(key)
            }}
            className={cn(
              'flex-1 rounded-full py-2.5 text-sm font-bold transition',
              tab === key ? 'bg-gold-grad text-ink-900 shadow-glow' : 'border border-white/10 text-zinc-400',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4 px-4 pt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass animate-pulse overflow-hidden rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-white/10" />
                  <div className="h-2 w-1/4 rounded bg-white/5" />
                </div>
              </div>
              <div className="mt-4 aspect-[4/5] w-full rounded-2xl bg-white/[0.06]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-4">
          {displayed.map((f, i) => (
            <FlexCard key={f.id} flex={f} index={i} />
          ))}
          {displayed.length === 0 && (
            <p className="py-16 text-center text-sm text-zinc-600">Aucune publication pour l'instant.</p>
          )}
          {hasMore && displayed.length > 0 && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto mt-2 flex items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm font-bold text-zinc-300 active:scale-95 disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Voir plus de publications'}
            </button>
          )}
        </div>
      )}

      <BrandSheet open={appSheet} onClose={() => setAppSheet(false)} />
    </div>
  )
}
