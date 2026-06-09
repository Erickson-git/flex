import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import type { DirectThread } from '@/lib/types'
import { DEMO_PROFILES } from '@/lib/demoData'
import { Avatar } from '@/components/Avatar'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { PioneerBadge } from '@/components/PioneerBadge'
import { OtakuTitleBadge } from '@/components/OtakuTitleBadge'
import { SparkButton } from '@/components/SparkButton'
import { VibePlayer } from '@/components/VibePlayer'
import { ShopSection } from '@/components/ShopSection'
import { SmartImage } from '@/components/SmartImage'
import { themeSkin } from '@/lib/otaku'
import { cn, compact, haptic } from '@/lib/utils'

export default function UserProfile() {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const user = DEMO_PROFILES.find((p) => p.username === username)

  if (!user) {
    return <div className="grid min-h-[100dvh] place-items-center text-zinc-500">Profil introuvable.</div>
  }

  function dm() {
    haptic(10)
    const thread: DirectThread = {
      id: `dm_${user!.username}`,
      peer: user!,
      last_message: '',
      last_at: new Date().toISOString(),
      unread: 0,
    }
    navigate(`/app/directs/${thread.id}`, { state: thread })
  }

  return (
    <div className="mx-auto max-w-lg pb-16">
      <div className="relative h-44">
        <SmartImage src={user.avatar_url} seed={user.username.length} className="absolute inset-0" blur />
        <button onClick={() => navigate(-1)} className="safe-top absolute left-3 top-2 grid h-10 w-10 place-items-center rounded-full bg-ink-900/50 text-white backdrop-blur">
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="-mt-12 px-5">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Avatar
            name={user.display_name}
            url={user.avatar_url}
            size={96}
            ring
            ringClass={cn('ring-[3px] ring-offset-2 ring-offset-ink-900', themeSkin(user.profile_theme).ring, themeSkin(user.profile_theme).glow)}
          />
        </motion.div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold">{user.display_name}</h1>
          <PrestigeBadge score={user.flex_score} />
          <OtakuTitleBadge titleId={user.otaku_title} size="sm" />
          <PioneerBadge tier={user.tier} rank={user.joined_rank} size="sm" />
        </div>
        <div className="text-zinc-500">@{user.username}</div>
        {user.bio && <p className="mt-2 text-sm text-zinc-300">{user.bio}</p>}

        <div className="mt-3 flex gap-4 text-sm">
          <span><b className="text-white">{compact(user.followers_count)}</b> <span className="text-zinc-500">followers</span></span>
          <span><b className="text-white">{compact(user.flex_score)}</b> <span className="text-zinc-500">score</span></span>
        </div>

        {/* Actions : Spark (drague) + DM */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SparkButton target={user} />
          <button onClick={dm} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-bold text-white active:scale-95">
            <MessageCircle className="h-5 w-5" /> Message
          </button>
        </div>

        {/* Vibe Audio */}
        <div className="mt-5">
          <VibePlayer url={user.music_url} label={`La vibe de ${user.display_name}`} />
        </div>

        {/* Flex Shop du vendeur */}
        <ShopSection sellerId={user.id} />
      </div>
    </div>
  )
}
