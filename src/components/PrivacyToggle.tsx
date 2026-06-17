import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { isOnlineHidden, setOnlineHidden } from '@/lib/privacy'
import { haptic } from '@/lib/utils'

/** Confidentialité : masquer son statut « en ligne / écrit… » aux autres. */
export function PrivacyToggle() {
  const [hidden, setHidden] = useState(isOnlineHidden())

  function toggle() {
    haptic(10)
    const next = !hidden
    setOnlineHidden(next)
    setHidden(next)
  }

  return (
    <button
      onClick={toggle}
      className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <EyeOff className="h-5 w-5 text-flex-cyan" />
        <div>
          <div className="text-sm font-bold text-white">Masquer mon statut « en ligne »</div>
          <div className="text-xs text-zinc-500">Les autres ne voient plus « en ligne » ni « écrit… ».</div>
        </div>
      </div>
      <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (hidden ? 'bg-gold' : 'bg-white/15')}>
        <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (hidden ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}
