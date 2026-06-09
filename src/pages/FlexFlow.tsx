import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { fetchFlow } from '@/lib/api'
import type { Flex } from '@/lib/types'
import { useAuth } from '@/store/useAuth'
import { useTripleTap } from '@/hooks/useTripleTap'
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
import { sortForYou, sortTrending } from '@/lib/feedAlgorithm'
import { cn, haptic, prestigeFromScore, prestigeProgress } from '@/lib/utils'

export default function FlexFlow() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [flexes, setFlexes] = useState<Flex[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'foryou' | 'trends'>('foryou')

  const displayed = tab === 'trends' ? sortTrending(flexes) : sortForYou(flexes)

  // Ghost Mode : triple-tap sur le logo → ouvre The Hideouts (geste secret).
  const onLogoTap = useTripleTap(() => {
    haptic([20, 40, 20])
    navigate('/ghost')
  })

  useEffect(() => {
    fetchFlow()
      .then(setFlexes)
      .finally(() => setLoading(false))
  }, [])

  const prog = me ? prestigeProgress(me.flex_score) : 0
  const meta = me ? prestigeFromScore(me.flex_score) : null

  return (
    <div className="mx-auto max-w-lg pb-28">
      <StarBoostToast />

      <header className="safe-top sticky top-0 z-30 bg-ink-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h1 onClick={onLogoTap} className="cursor-pointer select-none font-display text-3xl font-extrabold tracking-tight">
            <span className="text-gold-grad">FLEX</span>
          </h1>
          {me && (
            <div className="flex items-center gap-1.5">
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
        <div className="grid place-items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-4">
          {displayed.map((f, i) => (
            <FlexCard key={f.id} flex={f} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
