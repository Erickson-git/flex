// ─────────────────────────────────────────────────────────────
// Confidentialité (façon WhatsApp) — réglages locaux à l'appareil.
// ─────────────────────────────────────────────────────────────

const HIDE_ONLINE = 'flex.privacy.hideOnline'

/** L'utilisateur masque-t-il son statut « en ligne / écrit… » aux autres ? */
export function isOnlineHidden(): boolean {
  return localStorage.getItem(HIDE_ONLINE) === '1'
}

export function setOnlineHidden(hidden: boolean): void {
  if (hidden) localStorage.setItem(HIDE_ONLINE, '1')
  else localStorage.removeItem(HIDE_ONLINE)
}
