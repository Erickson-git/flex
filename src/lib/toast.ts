// ─────────────────────────────────────────────────────────────
// Mini-système de "toasts" : un retour visuel discret après une action
// (lien copié, enregistré, erreur…). Léger, sans dépendance.
// ─────────────────────────────────────────────────────────────

export type ToastKind = 'info' | 'success' | 'error'
export interface ToastMsg {
  id: number
  msg: string
  kind: ToastKind
}

let seq = 0
let listeners: Array<(t: ToastMsg) => void> = []

/** Affiche un toast. */
export function toast(msg: string, kind: ToastKind = 'info'): void {
  const t: ToastMsg = { id: ++seq, msg, kind }
  listeners.forEach((l) => l(t))
}

export const toastOk = (msg: string) => toast(msg, 'success')
export const toastErr = (msg: string) => toast(msg, 'error')

/** Abonnement (utilisé par le composant Toaster). */
export function onToast(cb: (t: ToastMsg) => void): () => void {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}
