import { useEffect, useRef } from 'react'

/**
 * Mesure le temps de rétention (dwell) d'un élément visible à l'écran.
 * Au démontage (ou sortie durable du viewport), `onLeave(ms)` reçoit le temps
 * cumulé d'attention — signal clé du moteur de Trends.
 */
export function useDwell(onLeave: (ms: number) => void) {
  const ref = useRef<HTMLElement>(null)
  const cb = useRef(onLeave)
  cb.current = onLeave

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let enteredAt: number | null = null
    let accumulated = 0
    let reported = false

    const flush = () => {
      if (enteredAt != null) {
        accumulated += performance.now() - enteredAt
        enteredAt = null
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (enteredAt == null) enteredAt = performance.now()
        } else {
          flush()
        }
      },
      { threshold: [0, 0.5, 1] },
    )
    io.observe(el)

    return () => {
      flush()
      io.disconnect()
      if (!reported && accumulated > 300) {
        reported = true
        cb.current(accumulated)
      }
    }
  }, [])

  return ref
}
