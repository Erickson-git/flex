import { Crown } from 'lucide-react'
import { premiumStatus } from '@/lib/premium'
import type { Profile } from '@/lib/types'

/** Pastille de statut premium : « VIP » (payant) ou « Essai · Xj » (gratuit). */
export function PremiumBadge({ me }: { me: Profile | null }) {
  const s = premiumStatus(me)
  if (!s.active) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
      <Crown className="h-3 w-3" />
      {s.trial ? `Essai · ${s.daysLeft}j` : 'VIP'}
    </span>
  )
}
