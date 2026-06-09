import { Sparkle } from 'lucide-react'
import { useEconomy } from '@/store/useEconomy'
import { compact, cn } from '@/lib/utils'

/** Pastille de solde de Sparks (Éclats) — la monnaie rare interne. */
export function SparksChip({ onClick, className }: { onClick?: () => void; className?: string }) {
  const wallet = useEconomy((s) => s.wallet)
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-flex-cyan/40 bg-flex-cyan/10 px-3 py-1.5 text-sm font-bold text-flex-cyan transition active:scale-95',
        className,
      )}
    >
      <Sparkle className="h-4 w-4 fill-flex-cyan" />
      {compact(wallet?.sparks ?? 0)}
    </button>
  )
}
