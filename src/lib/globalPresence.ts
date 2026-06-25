import type { RealtimeChannel } from '@supabase/supabase-js'
import { DEMO_MODE, supabase } from './supabase'
import { isOnlineHidden } from './privacy'

// ─────────────────────────────────────────────────────────────
// Présence EN LIGNE globale (façon WhatsApp) : un seul canal Realtime
// « online » où chaque utilisateur connecté se signale. On expose l'ensemble
// des ids en ligne pour afficher le point vert dans la liste des conversations.
// Confidentialité : si l'utilisateur masque son statut, il VOIT les autres
// mais ne se signale pas (pas de track).
// ─────────────────────────────────────────────────────────────

let ch: RealtimeChannel | null = null
let onlineIds = new Set<string>()
const listeners = new Set<(ids: Set<string>) => void>()

function emit() {
  listeners.forEach((l) => l(onlineIds))
}

export function startGlobalPresence(meId: string): void {
  if (DEMO_MODE || !supabase || ch) return
  ch = supabase.channel('online', { config: { presence: { key: meId } } })
  ch.on('presence', { event: 'sync' }, () => {
    onlineIds = new Set(Object.keys(ch!.presenceState()))
    emit()
  })
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED' && !isOnlineHidden()) ch!.track({ at: Date.now() })
  })
}

export function stopGlobalPresence(): void {
  if (ch && supabase) supabase.removeChannel(ch)
  ch = null
  onlineIds = new Set()
  emit()
}

/** S'abonne aux changements de présence ; renvoie une fonction de désabonnement. */
export function onPresence(cb: (ids: Set<string>) => void): () => void {
  listeners.add(cb)
  cb(onlineIds)
  return () => {
    listeners.delete(cb)
  }
}
