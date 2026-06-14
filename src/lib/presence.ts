import { DEMO_MODE, supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Présence temps réel d'un salon de chat : qui est en ligne + « écrit… ».
// 100 % Realtime (aucune table, aucun coût) → ressenti messagerie premium.
// ─────────────────────────────────────────────────────────────

export interface RoomPresence {
  sendTyping: () => void
  leave: () => void
}

export function joinRoomPresence(
  roomId: string,
  meId: string,
  opts: { onOnline: (online: boolean) => void; onTyping: () => void },
): RoomPresence {
  if (DEMO_MODE || !supabase) return { sendTyping: () => {}, leave: () => {} }

  const ch = supabase.channel('rt:' + roomId, {
    config: { presence: { key: meId }, broadcast: { self: false } },
  })

  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState()
    const others = Object.keys(state).filter((k) => k !== meId)
    opts.onOnline(others.length > 0)
  })
  ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
    if ((payload as { from?: string })?.from !== meId) opts.onTyping()
  })
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') ch.track({ at: Date.now() })
  })

  let last = 0
  return {
    sendTyping: () => {
      const now = Date.now()
      if (now - last < 1500) return // throttle : 1 signal / 1,5 s
      last = now
      ch.send({ type: 'broadcast', event: 'typing', payload: { from: meId } })
    },
    leave: () => {
      supabase!.removeChannel(ch)
    },
  }
}
