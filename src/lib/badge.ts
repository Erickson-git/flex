// ─────────────────────────────────────────────────────────────
// Badging API : affiche le nombre de notifications non lues directement
// sur l'icône de l'application installée (PWA) — écran d'accueil / dock.
// Best-effort : ignoré silencieusement là où l'API n'existe pas.
// ─────────────────────────────────────────────────────────────

type Badger = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/** Pose le compteur (ou l'efface si 0) sur l'icône de l'app. */
export function setAppBadge(count: number): void {
  try {
    const nav = navigator as Badger
    if (count > 0) nav.setAppBadge?.(count)
    else nav.clearAppBadge?.()
  } catch {
    /* API non supportée : no-op */
  }
}

/** Efface la pastille de l'icône. */
export function clearAppBadge(): void {
  try {
    ;(navigator as Badger).clearAppBadge?.()
  } catch {
    /* no-op */
  }
}
