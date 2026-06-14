import { DEMO_MODE, supabase } from './supabase'
import type { Notification } from './types'
import { uid } from './utils'
import { setAppBadge } from './badge'

// ─────────────────────────────────────────────────────────────
// Notifications de valorisation : on flatte l'utilisateur et on l'incite
// à publier. (Le vrai push hors-app nécessite une Edge Function / cron —
// voir engagement.sql `push_notification` + README.)
// ─────────────────────────────────────────────────────────────

const LS = 'flex.notifs'

const HYPE_POOL: Omit<Notification, 'id' | 'created_at' | 'read'>[] = [
  { kind: 'trend', title: 'Ton dernier post cartonne ! 🔥', body: 'Partage ton prochain look pour doubler tes vues.' },
  { kind: 'social', title: 'La communauté adore ton style ✦', body: 'Montre ton mood du jour en photo !' },
  { kind: 'trend', title: 'Tu es en tendance 📈', body: 'Ne t’arrête pas là, enchaîne un Flex.' },
  { kind: 'hype', title: 'Ton aura monte 👑', body: 'Un post de plus et tu débloques un palier.' },
  { kind: 'social', title: 'On te remarque 👀', body: 'De nouveaux profils visitent ta page.' },
]

function seed(): Notification[] {
  const base = Date.now()
  return HYPE_POOL.slice(0, 3).map((n, i) => ({
    ...n,
    id: uid(),
    read: false,
    created_at: new Date(base - i * 3_600_000).toISOString(),
  }))
}

export async function fetchNotifications(): Promise<Notification[]> {
  if (DEMO_MODE) {
    const raw = localStorage.getItem(LS)
    if (raw) return JSON.parse(raw) as Notification[]
    const s = seed()
    localStorage.setItem(LS, JSON.stringify(s))
    return s
  }
  const { data } = await supabase!
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40)
  return (data ?? []) as Notification[]
}

/** Compte les non-lues et met à jour la pastille de l'icône de l'app. */
export async function syncAppBadge(): Promise<void> {
  try {
    const list = await fetchNotifications()
    setAppBadge(list.filter((n) => !n.read).length)
  } catch {
    /* no-op */
  }
}

/** Rafraîchit la liste quand une nouvelle notification arrive (temps réel). */
export function subscribeNotifications(onChange: () => void): () => void {
  if (DEMO_MODE || !supabase) return () => {}
  const ch = supabase
    .channel('notif-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => onChange())
    .subscribe()
  return () => {
    supabase!.removeChannel(ch)
  }
}

export async function markAllRead(): Promise<void> {
  if (DEMO_MODE) {
    const raw = localStorage.getItem(LS)
    if (!raw) return
    const list = (JSON.parse(raw) as Notification[]).map((n) => ({ ...n, read: true }))
    localStorage.setItem(LS, JSON.stringify(list))
    return
  }
  await supabase!.from('notifications').update({ read: true }).eq('read', false)
}

/**
 * Enregistre une notification pour un AUTRE utilisateur (appel manqué,
 * message, like, commentaire, follow…). Best-effort via le RPC sécurisé.
 */
export async function recordNotification(
  toUser: string | null | undefined,
  kind: Notification['kind'],
  title: string,
  body?: string | null,
  opts?: { image?: string | null; link?: string | null; actorId?: string | null; actorName?: string | null },
): Promise<void> {
  if (DEMO_MODE || !supabase || !toUser) return
  try {
    await supabase.rpc('push_notification_rich', {
      p_user: toUser,
      p_kind: kind,
      p_title: title,
      p_body: body ?? null,
      p_image: opts?.image ?? null,
      p_link: opts?.link ?? null,
      p_actor_id: opts?.actorId ?? null,
      p_actor_name: opts?.actorName ?? null,
    })
  } catch {
    /* best-effort : ne casse jamais l'action */
  }
}

/** Ajoute localement une notif de hype (déclenchée par un événement client). */
export function pushLocalHype(index = 0): Notification {
  const tpl = HYPE_POOL[index % HYPE_POOL.length]
  const n: Notification = { ...tpl, id: uid(), read: false, created_at: new Date().toISOString() }
  if (DEMO_MODE) {
    const raw = localStorage.getItem(LS)
    const list = raw ? (JSON.parse(raw) as Notification[]) : []
    localStorage.setItem(LS, JSON.stringify([n, ...list]))
  }
  return n
}
