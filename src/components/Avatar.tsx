import { useState } from 'react'
import { dicebear } from '@/lib/media'
import { cn } from '@/lib/utils'

const GRADIENTS = [
  'from-flex-violet to-flex-pink',
  'from-flex-cyan to-flex-violet',
  'from-gold to-flex-pink',
  'from-flex-pink to-gold',
  'from-flex-cyan to-gold',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Avatar : utilise l'URL fournie, sinon génère un avatar DiceBear stylisé.
 * Si tout échoue, dégradé + initiale (jamais vide).
 */
export function Avatar({
  name,
  url,
  size = 44,
  ring,
  ringClass,
}: {
  name: string
  url?: string | null
  size?: number
  ring?: boolean
  ringClass?: string
}) {
  const [failed, setFailed] = useState(false)
  const grad = GRADIENTS[hash(name) % GRADIENTS.length]
  const src = url || dicebear(name)
  const showImg = !!src && !failed

  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink-600',
        ring && (ringClass ?? 'ring-2 ring-gold/70 ring-offset-2 ring-offset-ink-900'),
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className={cn('grid h-full w-full place-items-center bg-gradient-to-br', grad)}>
          <span className="font-bold text-white/90" style={{ fontSize: size * 0.4 }}>
            {name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}
