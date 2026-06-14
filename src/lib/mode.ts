// Mode d'affichage : Nuit (sombre, défaut), Jour (clair), ou Auto (selon
// l'heure locale de l'appareil — qui reflète la position de l'utilisateur).
export type Mode = 'night' | 'day' | 'auto'

const KEY = 'flex.mode'

export function getMode(): Mode {
  try {
    const v = localStorage.getItem(KEY) as Mode | null
    return v === 'day' || v === 'auto' ? v : 'night'
  } catch {
    return 'night'
  }
}

function resolve(mode: Mode): 'night' | 'day' {
  if (mode === 'auto') {
    const h = new Date().getHours()
    return h >= 7 && h < 19 ? 'day' : 'night'
  }
  return mode
}

export function applyMode(mode: Mode): void {
  document.documentElement.setAttribute('data-mode', resolve(mode))
}

export function setMode(mode: Mode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* quota */
  }
  applyMode(mode)
}

let timer: number | null = null
export function initMode(): void {
  applyMode(getMode())
  // En mode auto, on ré-évalue régulièrement (jour ↔ nuit).
  if (timer) clearInterval(timer)
  timer = window.setInterval(() => {
    if (getMode() === 'auto') applyMode('auto')
  }, 600000)
}
