import { cn } from '@/lib/utils'

/**
 * Marque officielle FLEX : éclair néon doré sur fond noir + baseline.
 * Source unique = /public/logo.jpg (asset officiel).
 */
export function BrandLogo({
  size = 160,
  baseline = true,
  className,
}: {
  size?: number
  baseline?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <img
        src="/logo.jpg"
        alt="FLEX — Freedom · Party · Show-biz"
        width={size}
        height={size}
        className="rounded-3xl shadow-glow ring-1 ring-gold/20"
        style={{ width: size, height: size }}
      />
      {baseline && (
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-gold-soft">
          Freedom <span className="text-zinc-600">|</span> Party{' '}
          <span className="text-zinc-600">|</span> Show-biz
        </div>
      )}
    </div>
  )
}
