import { useState } from 'react'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { getMode, setMode, type Mode } from '@/lib/mode'
import { cn, haptic } from '@/lib/utils'

const OPTS: { mode: Mode; label: string; icon: typeof Moon }[] = [
  { mode: 'night', label: 'Nuit', icon: Moon },
  { mode: 'day', label: 'Jour', icon: Sun },
  { mode: 'auto', label: 'Auto', icon: SunMoon },
]

export function ModeToggle() {
  const [mode, setM] = useState<Mode>(getMode())

  function choose(m: Mode) {
    haptic(8)
    setMode(m)
    setM(m)
  }

  return (
    <div className="mt-3">
      <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Mode d'affichage</div>
      <div className="grid grid-cols-3 gap-2">
        {OPTS.map((o) => (
          <button
            key={o.mode}
            onClick={() => choose(o.mode)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-bold transition',
              mode === o.mode ? 'border-gold/50 bg-gold/10 text-gold' : 'border-white/10 bg-white/[0.03] text-zinc-400',
            )}
          >
            <o.icon className="h-5 w-5" />
            {o.label}
          </button>
        ))}
      </div>
      {mode === 'auto' && (
        <p className="mt-1.5 text-center text-[11px] text-zinc-600">Jour de 7 h à 19 h, Nuit sinon (heure locale).</p>
      )}
    </div>
  )
}
