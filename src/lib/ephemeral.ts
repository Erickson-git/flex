// ─────────────────────────────────────────────────────────────
// Messages éphémères par conversation (façon WhatsApp « messages éphémères »).
// Réglage local : durée (en secondes) avant disparition. 0 = désactivé.
// ─────────────────────────────────────────────────────────────

const KEY = (roomId: string) => `flex.ephemeral.${roomId}`

/** Durée d'éphémérité du salon (secondes ; 0 = off). */
export function getEphemeral(roomId: string): number {
  return Number(localStorage.getItem(KEY(roomId)) || 0)
}

export function setEphemeral(roomId: string, seconds: number): void {
  if (seconds > 0) localStorage.setItem(KEY(roomId), String(seconds))
  else localStorage.removeItem(KEY(roomId))
}

/** Date d'expiration ISO pour un nouveau message (ou null si désactivé). */
export function expiryFor(roomId: string): string | null {
  const sec = getEphemeral(roomId)
  return sec > 0 ? new Date(Date.now() + sec * 1000).toISOString() : null
}

/** Le message est-il expiré (à masquer) ? */
export function isExpired(expires_at?: string | null): boolean {
  return !!expires_at && new Date(expires_at).getTime() <= Date.now()
}
