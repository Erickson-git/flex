// ─────────────────────────────────────────────────────────────
// Garde « invité = lecture seule ».
//
// Un compte INVITÉ peut tout REGARDER mais ne peut rien faire d'autre.
// Chaque action d'écriture (like, suivre, message, achat, etc.) appelle
// `ensureCanInteract()` en tête : si l'utilisateur courant est un invité,
// on affiche un rappel et on lève une erreur typée qui interrompt l'action.
//
// Le flag est tenu à jour par le store d'auth (setGuestFlag) à chaque
// changement de profil — évite tout import circulaire avec le store/api.
// ─────────────────────────────────────────────────────────────

import { toast } from './toast'

let _isGuest = false

/** Mis à jour par le store d'auth quand le profil courant change. */
export function setGuestFlag(isGuest: boolean): void {
  _isGuest = isGuest
}

/** L'utilisateur courant est-il un invité (lecture seule) ? */
export function isGuestNow(): boolean {
  return _isGuest
}

/** Erreur levée quand un invité tente une action d'écriture. */
export class GuestBlockedError extends Error {
  constructor() {
    super('Action réservée aux comptes — un invité peut seulement regarder.')
    this.name = 'GuestBlockedError'
  }
}

const GUEST_MSG = 'Crée un compte pour interagir — l’invité peut seulement regarder 👀'

/**
 * À appeler en tête de TOUTE action d'écriture/interaction (fonctions lib).
 * Lève `GuestBlockedError` (et affiche un toast) si l'utilisateur est invité.
 */
export function ensureCanInteract(): void {
  if (_isGuest) {
    toast(GUEST_MSG, 'info')
    throw new GuestBlockedError()
  }
}

/**
 * Variante NON bloquante pour les handlers de composant : affiche le rappel et
 * renvoie `true` si l'utilisateur est invité (le handler fait alors `return`).
 * Ex. : `if (blockIfGuest()) return`
 */
export function blockIfGuest(): boolean {
  if (_isGuest) {
    toast(GUEST_MSG, 'info')
    return true
  }
  return false
}
