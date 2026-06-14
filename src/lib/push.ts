import { DEMO_MODE, supabase } from './supabase'

// Clé VAPID PUBLIQUE (sans danger côté client). La privée vit uniquement
// en secret de l'Edge Function send-push.
const VAPID_PUBLIC = 'BJE4HwTw7ZmFUKc4M4xa-9fRvmvVMecTFjGZtct_YpRNPLkao99R_6ZrIVMrS1IvT2JUwTXthQwXJ9KUaIUltlw'

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export type PushResult = 'ok' | 'denied' | 'unsupported' | 'error'

/** Demande l'autorisation et enregistre l'abonnement push dans Supabase. */
export async function enablePush(): Promise<PushResult> {
  if (DEMO_MODE || !supabase || !pushSupported()) return 'unsupported'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys) return 'error'
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'endpoint' },
      )
    if (error) throw error
    return 'ok'
  } catch {
    return 'error'
  }
}

/**
 * Si déjà autorisé, ré-enregistre silencieusement l'abonnement (au cas où il
 * aurait changé / la table aurait été vidée). À appeler au démarrage.
 */
export async function syncPushIfGranted(): Promise<void> {
  if (DEMO_MODE || !supabase || !pushSupported()) return
  if (Notification.permission !== 'granted') return
  await enablePush()
}

/** Envoie une notification push à un utilisateur (best-effort, via Edge Function). */
export async function notifyUser(
  toUser: string,
  title: string,
  body: string,
  url = '/app',
  tag?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (DEMO_MODE || !supabase) return
  try {
    await supabase.functions.invoke('send-push', {
      body: { to_user: toUser, title, body, url, tag, ...extra },
    })
  } catch {
    /* best-effort : l'absence de push ne doit jamais casser l'action */
  }
}
