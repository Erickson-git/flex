// Petits effets sonores générés (Web Audio) — aucun fichier requis.
// playDing : un "ding-dong" agréable d'environ 1 seconde pour les notifications.

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

/** Son de notification (~1 s). Best-effort : silencieux si l'audio est bloqué. */
export function playDing(): void {
  const c = audioCtx()
  if (!c) return
  const now = c.currentTime
  const notes = [
    { f: 880, t: 0 }, // La5
    { f: 1174.7, t: 0.18 }, // Ré6
  ]
  for (const { f, t } of notes) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    osc.connect(gain)
    gain.connect(c.destination)
    const start = now + t
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.82)
    osc.start(start)
    osc.stop(start + 0.85)
  }
}
