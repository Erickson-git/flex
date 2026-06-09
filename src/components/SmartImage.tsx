import { useState } from 'react'
import { cn } from '@/lib/utils'

const FALLBACKS = [
  'from-flex-violet via-ink-700 to-flex-pink',
  'from-flex-cyan via-ink-700 to-flex-violet',
  'from-flex-pink via-ink-700 to-gold',
  'from-gold via-ink-700 to-flex-violet',
]

/**
 * Image "premium" :
 *  - applique overlay sombre + léger boost de contraste/saturation (look club)
 *  - en cas d'échec de l'URL distante, bascule sur un dégradé néon
 *    → AUCUN placeholder vide ne s'affiche jamais.
 */
export function SmartImage({
  src,
  alt = '',
  seed = 0,
  className,
  overlay = true,
  blur = false,
}: {
  src: string | null
  alt?: string
  seed?: number
  className?: string
  overlay?: boolean
  blur?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const grad = FALLBACKS[Math.abs(seed) % FALLBACKS.length]
  const showImg = src && src.startsWith('http') && !failed

  return (
    <div className={cn('relative overflow-hidden bg-ink-700', className)}>
      {showImg ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full object-cover transition duration-700',
            'contrast-[1.08] saturate-[1.15]',
            blur && 'scale-110 blur-[2px]',
          )}
        />
      ) : (
        <div className={cn('h-full w-full bg-gradient-to-br', grad)} />
      )}

      {overlay && (
        <>
          {/* voile sombre pour la lisibilité + ambiance nocturne */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
          {/* liseré néon subtil */}
          <div className="pointer-events-none absolute inset-0 mix-blend-overlay bg-gradient-to-tr from-flex-violet/20 via-transparent to-flex-pink/20" />
        </>
      )}
    </div>
  )
}
