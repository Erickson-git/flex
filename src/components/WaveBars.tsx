/**
 * Onde sonore animée — habillage visuel pour les publications audio.
 * Purement décoratif (CSS), aucune analyse de fréquence : léger et fluide.
 * `playing` accélère/anime les barres ; sinon elles restent figées en relief.
 */
export function WaveBars({ playing = false, bars = 28 }: { playing?: boolean; bars?: number }) {
  return (
    <div className="flex h-12 items-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => {
        // hauteur pseudo-aléatoire stable (pas de Math.random au render)
        const h = 20 + ((i * 37) % 80)
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-gold-grad"
            style={{
              height: `${h}%`,
              animation: playing ? `wave 0.9s ease-in-out ${i * 0.04}s infinite alternate` : undefined,
              opacity: playing ? 1 : 0.55,
            }}
          />
        )
      })}
      <style>{`@keyframes wave{from{transform:scaleY(0.4)}to{transform:scaleY(1)}}`}</style>
    </div>
  )
}
