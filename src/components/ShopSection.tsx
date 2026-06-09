import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Sparkle, Store } from 'lucide-react'
import type { DirectThread, ShopItem } from '@/lib/types'
import { getShopItems } from '@/lib/social'
import { DEMO_PROFILES } from '@/lib/demoData'
import { SmartImage } from './SmartImage'
import { compact, haptic } from '@/lib/utils'

/** Mini-boutique affichée sur un profil ou un Squad. */
export function ShopSection({ sellerId }: { sellerId?: string }) {
  const navigate = useNavigate()
  const items = getShopItems(sellerId)
  if (items.length === 0) return null

  function negotiate(item: ShopItem) {
    haptic(10)
    const peer =
      DEMO_PROFILES.find((p) => p.id === item.seller_id) ??
      ({ id: item.seller_id, username: item.seller_name.toLowerCase(), display_name: item.seller_name, avatar_url: null } as never)
    const thread: DirectThread = {
      id: `dm_shop_${item.seller_id}`,
      peer,
      last_message: `À propos de « ${item.title} »`,
      last_at: new Date().toISOString(),
      unread: 0,
    }
    navigate(`/app/directs/${thread.id}`, { state: thread })
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
        <Store className="h-4 w-4 text-gold" /> Flex Shop
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60"
          >
            <SmartImage src={it.photo_url} seed={it.id.length} className="aspect-square w-full" overlay={false} />
            <div className="p-3">
              <div className="truncate text-sm font-semibold text-white">{it.title}</div>
              <div className="mt-0.5 flex items-center gap-1 text-sm font-bold text-gold">
                {it.currency === 'sparks' ? <Sparkle className="h-3.5 w-3.5" /> : null}
                {compact(it.price)} {it.currency === 'fcfa' ? 'FCFA' : ''}
              </div>
              <button
                onClick={() => negotiate(it)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-gold-grad py-2 text-xs font-bold text-ink-900 active:scale-95"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Négocier
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
