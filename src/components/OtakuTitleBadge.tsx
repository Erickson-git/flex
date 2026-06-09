import { otakuTitle } from '@/lib/otaku'
import { cn } from '@/lib/utils'

/** Titre de prestige otaku arboré sur le profil (ex: Hokage). */
export function OtakuTitleBadge({ titleId, size = 'md' }: { titleId?: string | null; size?: 'sm' | 'md' }) {
  const t = otakuTitle(titleId)
  if (!t) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-flex-violet/50 bg-flex-violet/10 font-bold uppercase tracking-wider text-flex-violet',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span>{t.emoji}</span>
      {t.label}
    </span>
  )
}
