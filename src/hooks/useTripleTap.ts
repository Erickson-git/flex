import { useRef } from 'react'

/**
 * Détecte un triple-tap rapide sur un élément.
 * Sert de "geste secret" pour ouvrir le Ghost Mode (The Hideouts)
 * sans bouton visible — invisible pour un regard extérieur.
 */
export function useTripleTap(onTrigger: () => void, windowMs = 600) {
  const taps = useRef<number[]>([])

  return function handleTap() {
    const t = performance.now()
    taps.current = taps.current.filter((x) => t - x < windowMs)
    taps.current.push(t)
    if (taps.current.length >= 3) {
      taps.current = []
      onTrigger()
    }
  }
}
