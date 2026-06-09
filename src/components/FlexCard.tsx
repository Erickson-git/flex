import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Share2, TrendingUp } from 'lucide-react'
import type { Flex } from '@/lib/types'
import { compact, haptic, timeAgo } from '@/lib/utils'
import { recordView, shareFlex, toggleFlexLike } from '@/lib/api'
import { useDwell } from '@/hooks/useDwell'
import { Avatar } from './Avatar'
import { PioneerBadge } from './PioneerBadge'
import { PrestigeBadge } from './PrestigeBadge'
import { FlexReaction } from './FlexReaction'
import { SmartImage } from './SmartImage'
import { ReportButton } from './ReportButton'

const GRADS: Record<string, string> = {
  'gradient:violet': 'from-flex-violet/80 via-ink-700 to-flex-pink/60',
  'gradient:cyan': 'from-flex-cyan/70 via-ink-700 to-flex-violet/60',
  'gradient:pink': 'from-flex-pink/70 via-ink-700 to-gold/50',
}

export function FlexCard({ flex, index = 0 }: { flex: Flex; index?: number }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(!!flex.liked_by_me)
  const [count, setCount] = useState(flex.likes_count)
  const [shares, setShares] = useState(flex.shares_count ?? 0)
  const dwellRef = useDwell((ms) => recordView(flex.id, ms))

  async function onShare() {
    haptic(12)
    setShares((s) => s + 1)
    const url = `${location.origin}/?p=${flex.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'FLEX', text: flex.content || 'Regarde ce Flex ✦', url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* annulé */
    }
    shareFlex(flex.id).catch(() => {})
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
    }, 700)
    return () => clearInterval(t)
  }, [flex.boosted, flex.id])

  async function onToggle() {
    const next = !liked
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    try {
      await toggleFlexLike(flex.id, liked)
    } catch {
      setLiked(liked)
      setCount(flex.likes_count)
    }
  }

  const author = flex.author
  const isGrad = flex.media_url?.startsWith('gradient:')

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
        onClick={() => author && navigate(`/app/u/${author.username}`)}
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

      {flex.content && <p className="px-4 pb-3 text-[15px] leading-relaxed text-zinc-100">{flex.content}</p>}

      {flex.media_url &&
        (isGrad ? (
          <div className={`mx-4 mb-3 aspect-[4/3] rounded-2xl bg-gradient-to-br ${GRADS[flex.media_url] ?? 'from-ink-600 to-ink-700'}`} />
        ) : (
          <SmartImage src={flex.media_url} seed={index + (flex.id.length || 0)} className="mx-4 mb-3 aspect-[4/5] rounded-2xl" />
        ))}

      <div className="flex items-center gap-6 px-4 pb-4 pt-1">
        <FlexReaction count={count} liked={liked} onToggle={onToggle} />
        <button className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition hover:text-zinc-200">
          <MessageCircle className="h-5 w-5" />
          {flex.comments_count}
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition hover:text-gold">
          <Share2 className="h-5 w-5" />
          {shares > 0 ? compact(shares) : ''}
        </button>
        <div className="ml-auto">
          <ReportButton targetType="post" targetId={flex.id} />
        </div>
      </div>
    </motion.article>
  )
}
