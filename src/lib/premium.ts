import { DEMO_MODE, supabase } from './supabase'
import { applyArenaDelta } from './economy'
import type { Profile } from './types'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// Tunnel de monétisation locale (Moov / Flooz) + back-office admin.
// Le numéro de paiement vient de l'env (jamais hardcodé) et est affiché masqué.
// ─────────────────────────────────────────────────────────────

export interface Product {
  id: string
  label: string
  amountFcfa: number
  sparks: number
  vip: boolean
  emoji: string
}

export const PRODUCTS: Product[] = [
  { id: 'pack_s', label: '1 200 Sparks', amountFcfa: 500, sparks: 1200, vip: false, emoji: '✨' },
  { id: 'pack_m', label: '3 000 Sparks', amountFcfa: 1000, sparks: 3000, vip: false, emoji: '💫' },
  { id: 'pack_l', label: '8 000 Sparks', amountFcfa: 2500, sparks: 8000, vip: false, emoji: '🌟' },
  { id: 'vip', label: 'Statut VIP + 5 000 Sparks', amountFcfa: 5000, sparks: 5000, vip: true, emoji: '👑' },
]

export type Provider = 'moov' | 'flooz'

export interface PremiumOrder {
  id: string
  user_id: string
  user_name?: string
  product: string
  amount_fcfa: number
  provider: Provider
  receipt_url: string | null
  sparks_reward: number
  grants_vip: boolean
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

/** Numéro de paiement (env). Affiché masqué pour la confidentialité. */
export function paymentNumber(): string {
  return (import.meta.env.VITE_PAYMENT_MOOV_NUMBER as string) || ''
}
export function maskedNumber(): string {
  const n = paymentNumber().replace(/\s/g, '')
  if (!n) return '•• •• •• ••'
  return n.slice(0, 4) + ' •• ' + n.slice(-2)
}

const ADMIN_USERNAME = ((import.meta.env.VITE_ADMIN_USERNAME as string) || '').toLowerCase()
export function isAdmin(me: Profile | null): boolean {
  if (!me) return false
  if (ADMIN_USERNAME && me.username === ADMIN_USERNAME) return true
  // Démo : si aucun admin n'est défini, on autorise l'accès local pour tester.
  return DEMO_MODE && !ADMIN_USERNAME
}

const LS_ORDERS = 'flex.orders'
function readOrders(): PremiumOrder[] {
  try {
    return JSON.parse(localStorage.getItem(LS_ORDERS) || '[]') as PremiumOrder[]
  } catch {
    return []
  }
}
function writeOrders(o: PremiumOrder[]) {
  try {
    localStorage.setItem(LS_ORDERS, JSON.stringify(o))
  } catch {
    /* quota — les reçus dataURL peuvent être lourds */
  }
}

/** Soumet une commande avec le reçu (capture d'écran du SMS). */
export async function submitOrder(
  me: Profile,
  product: Product,
  provider: Provider,
  receiptDataUrl: string | null,
): Promise<PremiumOrder> {
  if (DEMO_MODE) {
    const order: PremiumOrder = {
      id: uid(),
      user_id: me.id,
      user_name: me.display_name,
      product: product.label,
      amount_fcfa: product.amountFcfa,
      provider,
      receipt_url: receiptDataUrl,
      sparks_reward: product.sparks,
      grants_vip: product.vip,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    writeOrders([order, ...readOrders()])
    return order
  }

  // Prod : upload du reçu dans le bucket "receipts" puis insertion.
  let path: string | null = null
  if (receiptDataUrl) {
    const blob = await (await fetch(receiptDataUrl)).blob()
    path = `${me.id}/${uid()}.jpg`
    const { error: upErr } = await supabase!.storage.from('receipts').upload(path, blob, { upsert: false })
    if (upErr) throw upErr
  }
  const { data, error } = await supabase!
    .from('premium_orders')
    .insert({
      user_id: me.id,
      product: product.label,
      amount_fcfa: product.amountFcfa,
      provider,
      receipt_url: path,
      sparks_reward: product.sparks,
      grants_vip: product.vip,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as PremiumOrder
}

// ── Admin ───────────────────────────────────────────────────────
export async function fetchPendingOrders(): Promise<PremiumOrder[]> {
  if (DEMO_MODE) return readOrders().filter((o) => o.status === 'pending')
  const { data, error } = await supabase!
    .from('premium_orders')
    .select('*, user:profiles!user_id(display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as (PremiumOrder & { user?: { display_name: string } })[]).map((o) => ({
    ...o,
    user_name: o.user?.display_name,
  }))
}

/** Reçoit aussi l'URL signée du reçu en prod (le bucket est privé). */
export async function receiptUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  if (DEMO_MODE) return path // déjà une dataURL
  const { data } = await supabase!.storage.from('receipts').createSignedUrl(path, 600)
  return data?.signedUrl ?? null
}

export async function totalUsers(): Promise<number> {
  if (DEMO_MODE) return 1240 + readOrders().length // chiffre "vivant" en démo
  const { data } = await supabase!.rpc('total_users')
  return (data as number) ?? 0
}

/** Validation/refus. En démo, crédite directement le wallet local. */
export async function reviewOrder(order: PremiumOrder, approve: boolean): Promise<void> {
  if (DEMO_MODE) {
    if (approve && order.sparks_reward > 0) await applyArenaDelta(order.user_id, order.sparks_reward)
    writeOrders(
      readOrders().map((o) => (o.id === order.id ? { ...o, status: approve ? 'approved' : 'rejected' } : o)),
    )
    return
  }
  const { error } = await supabase!.rpc('review_order', { p_order: order.id, p_approve: approve })
  if (error) throw error
}
