import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Delete, Lock, ShieldCheck } from 'lucide-react'
import { cn, haptic } from '@/lib/utils'

const PIN_KEY = 'flex.hideout.pin'

export function getStoredPin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY)
  } catch {
    return null
  }
}

/**
 * Verrou des Hideouts. Premier passage = définition du code (4 chiffres).
 * Ensuite, code requis à chaque entrée. Le contenu reste invisible tant
 * que le verrou n'est pas franchi — c'est le "jardin secret" privé de
 * l'utilisateur (logique identique aux dossiers verrouillés / Signal).
 */
export function HideoutLock({ onUnlock }: { onUnlock: () => void }) {
  const existing = getStoredPin()
  const [mode] = useState<'set' | 'enter'>(existing ? 'enter' : 'set')
  const [first, setFirst] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [hint, setHint] = useState(
    existing ? 'Saisis ton code secret' : 'Crée un code à 4 chiffres',
  )

  function press(d: string) {
    if (pin.length >= 4) return
    haptic(8)
    const next = pin + d
    setPin(next)
    if (next.length === 4) setTimeout(() => evaluate(next), 120)
  }

  function evaluate(code: string) {
    if (mode === 'set') {
      if (!first) {
        setFirst(code)
        setPin('')
        setHint('Confirme ton code')
        return
      }
      if (first === code) {
        localStorage.setItem(PIN_KEY, code)
        haptic([10, 40, 10])
        onUnlock()
      } else {
        fail('Les codes ne correspondent pas')
        setFirst(null)
        setHint('Crée un code à 4 chiffres')
      }
      return
    }
    // mode enter
    if (code === existing) {
      haptic([10, 40, 10])
      onUnlock()
    } else {
      fail('Code incorrect')
    }
  }

  function fail(msg: string) {
    haptic([30, 20, 30])
    setShake(true)
    setHint(msg)
    setPin('')
    setTimeout(() => setShake(false), 450)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <div className="pointer-events-none absolute inset-0 bg-noir-grad" />
      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative flex flex-col items-center"
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5">
          <Lock className="h-7 w-7 text-gold" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">The Hideouts</h1>
        <p className="mt-1 text-sm text-zinc-500">{hint}</p>

        {/* points du code */}
        <div className="mt-7 flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                'h-3.5 w-3.5 rounded-full border transition',
                i < pin.length ? 'border-gold bg-gold shadow-glow' : 'border-white/20',
              )}
            />
          ))}
        </div>

        {/* pavé numérique */}
        <div className="mt-10 grid grid-cols-3 gap-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <Key key={d} onClick={() => press(d)}>
              {d}
            </Key>
          ))}
          <span />
          <Key onClick={() => press('0')}>0</Key>
          <Key onClick={() => setPin((p) => p.slice(0, -1))} subtle>
            <Delete className="h-6 w-6" />
          </Key>
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-zinc-600">
          <ShieldCheck className="h-3.5 w-3.5" />
          Chiffré sur ton appareil. Invisible depuis le Flow.
        </p>
      </motion.div>
    </div>
  )
}

function Key({
  children,
  onClick,
  subtle,
}: {
  children: ReactNode
  onClick: () => void
  subtle?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'grid h-16 w-16 place-items-center rounded-full text-2xl font-semibold transition active:scale-90',
        subtle ? 'text-zinc-400' : 'border border-white/10 bg-white/[0.03] text-white active:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}
