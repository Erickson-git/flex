// ─────────────────────────────────────────────────────────────
// Installation de l'app (PWA). On capture l'événement `beforeinstallprompt`
// DÈS le chargement (il peut survenir avant le rendu du profil), puis le
// composant InstallApp propose « Télécharger l'application ».
// Sur iOS (pas d'événement), on affiche un guide manuel.
// ─────────────────────────────────────────────────────────────

type BIPEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BIPEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // empêche la mini-infobar par défaut → on déclenche nous-mêmes
    deferred = e as BIPEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** L'invite d'installation native est-elle disponible (Android/Chrome…) ? */
export function canInstall(): boolean {
  return !!deferred
}

/** L'app tourne-t-elle déjà en mode installé (écran d'accueil) ? */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

/** iOS (Safari/iPhone/iPad) : pas d'invite native → guide manuel requis. */
export function isIOS(): boolean {
  const ua = navigator.userAgent || ''
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS récents se font passer pour macOS → on détecte le tactile.
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1
  return iOSDevice || iPadOS
}

/** S'abonne aux changements de disponibilité de l'invite. */
export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Déclenche l'invite native. Renvoie true si l'utilisateur a accepté. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}
