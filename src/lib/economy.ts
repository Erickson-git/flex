import { DEMO_MODE, supabase } from './supabase'
import type { MarketListing, ProfileView, Wallet } from './types'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// API économique unifiée (Sparks).
// En MODE DÉMO : tout vit dans localStorage, mais les opérations
// critiques (transfert, achat) sont écrites de façon "atomique-like"
// (lecture → vérif solde → écriture immédiate, sans await intermédiaire)
// pour reproduire le comportement anti-double-dépense.
// En PROD : on appelle les RPC Postgres `security definer` (verrous réels).
// ─────────────────────────────────────────────────────────────

const LS = {
  wallet: 'flex.wallet',
  badges: 'flex.badges',
  listings: 'flex.listings',
  views: 'flex.views',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// ── Wallet ──────────────────────────────────────────────────────
function demoWallet(userId: string): Wallet {
  const w = read<Wallet | null>(LS.wallet, null)
  if (w && w.user_id === userId) return w
  const fresh: Wallet = {
    user_id: userId,
    sparks: 30, // Sparks de bienvenue
    streak_days: 0,
    last_checkin: null,
    last_active: new Date().toISOString(),
  }
  write(LS.wallet, fresh)
  return fresh
}

export async function fetchWallet(userId: string): Promise<Wallet> {
  if (DEMO_MODE) return demoWallet(userId)
  await supabase!.rpc('ensure_wallet', { p_user: userId })
  const { data } = await supabase!.from('wallets').select('*').eq('user_id', userId).single()
  return (data as Wallet) ?? demoFallback(userId)
}

function demoFallback(userId: string): Wallet {
  return { user_id: userId, sparks: 0, streak_days: 0, last_checkin: null, last_active: new Date().toISOString() }
}

/**
 * Applique un gain/perte de Sparks issu de l'Arène (duel ou pari).
 * En démo : écrit le wallet local (clampé ≥ 0). En prod : le règlement est
 * fait serveur par les RPC `settle_match`/`place_bet` ; on relit le wallet.
 */
export async function applyArenaDelta(userId: string, delta: number): Promise<Wallet> {
  if (DEMO_MODE) {
    const w = demoWallet(userId)
    const wallet: Wallet = { ...w, sparks: Math.max(0, w.sparks + delta) }
    write(LS.wallet, wallet)
    return wallet
  }
  return fetchWallet(userId)
}

/** Dépense atomique de Sparks (achat de titre/thème otaku, etc.). */
export async function spendSparks(userId: string, amount: number, reason: string): Promise<Wallet> {
  if (amount <= 0) throw new Error('Montant invalide')
  if (DEMO_MODE) {
    const w = demoWallet(userId)
    if (w.sparks < amount) throw new Error('Solde insuffisant')
    const wallet: Wallet = { ...w, sparks: w.sparks - amount }
    write(LS.wallet, wallet)
    return wallet
  }
  const { error } = await supabase!.rpc('spend_sparks', { p_amount: amount, p_reason: reason })
  if (error) throw error
  return fetchWallet(userId)
}

/** Marque l'activité (pour le decay / aversion à la perte). */
export function touchActive() {
  if (!DEMO_MODE) return
  const w = read<Wallet | null>(LS.wallet, null)
  if (w) write(LS.wallet, { ...w, last_active: new Date().toISOString() })
}

// ── Check-in quotidien (streak) ─────────────────────────────────
export async function dailyCheckin(userId: string): Promise<{ streak: number; reward: number; wallet: Wallet }> {
  if (DEMO_MODE) {
    const w = demoWallet(userId)
    if (w.last_checkin === todayISO()) throw new Error('Déjà validé aujourd’hui')
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const streak = w.last_checkin === yesterday ? w.streak_days + 1 : 1
    const reward = 10 + Math.min(streak, 30) * 2
    const wallet: Wallet = {
      ...w,
      streak_days: streak,
      last_checkin: todayISO(),
      sparks: w.sparks + reward,
      last_active: new Date().toISOString(),
    }
    write(LS.wallet, wallet)
    return { streak, reward, wallet }
  }
  const { data, error } = await supabase!.rpc('daily_checkin')
  if (error) throw error
  const row = (data as { streak: number; reward: number }[])[0]
  const wallet = await fetchWallet(userId)
  return { streak: row.streak, reward: row.reward, wallet }
}

// ── Transfert P2P atomique ──────────────────────────────────────
export async function transferSparks(fromId: string, toId: string, amount: number): Promise<Wallet> {
  if (amount <= 0) throw new Error('Montant invalide')
  if (fromId === toId) throw new Error('Transfert vers soi-même interdit')
  if (DEMO_MODE) {
    const w = demoWallet(fromId)
    if (w.sparks < amount) throw new Error('Solde insuffisant')
    const wallet: Wallet = { ...w, sparks: w.sparks - amount } // débit immédiat
    write(LS.wallet, wallet)
    return wallet
  }
  const { error } = await supabase!.rpc('transfer_sparks', { p_to: toId, p_amount: amount })
  if (error) throw error
  return fetchWallet(fromId)
}

// ── Badges possédés ─────────────────────────────────────────────
export async function fetchBadges(userId: string): Promise<string[]> {
  if (DEMO_MODE) return read<string[]>(LS.badges, ['Founder’s Crown', 'Neon Halo'])
  const { data } = await supabase!.from('user_badges').select('badge').eq('user_id', userId)
  return ((data ?? []) as { badge: string }[]).map((b) => b.badge)
}

// ── Marché ──────────────────────────────────────────────────────
const SEED_LISTINGS: MarketListing[] = [
  { id: 'l1', seller_id: 'u_nova', seller_name: 'NOVA', kind: 'badge', payload: 'Pioneer #3', price_sparks: 900, status: 'open', created_at: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 'l2', seller_id: 'u_kenz', seller_name: 'KENZO', kind: 'badge', payload: 'Hype Master', price_sparks: 420, status: 'open', created_at: new Date(Date.now() - 7_200_000).toISOString() },
  { id: 'l3', seller_id: 'u_lux', seller_name: 'LUX', kind: 'badge', payload: 'Golden Aura', price_sparks: 1500, status: 'open', created_at: new Date(Date.now() - 1_800_000).toISOString() },
]

export async function fetchListings(): Promise<MarketListing[]> {
  if (DEMO_MODE) {
    const stored = read<MarketListing[] | null>(LS.listings, null)
    if (stored) return stored.filter((l) => l.status === 'open')
    write(LS.listings, SEED_LISTINGS)
    return SEED_LISTINGS
  }
  const { data, error } = await supabase!
    .from('market_listings')
    .select('*, seller:profiles!seller_id(display_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as (MarketListing & { seller?: { display_name: string } })[]).map((l) => ({
    ...l,
    seller_name: l.seller?.display_name ?? 'Anonyme',
  }))
}

export async function listBadge(userId: string, userName: string, badge: string, price: number): Promise<MarketListing> {
  if (price <= 0) throw new Error('Prix invalide')
  if (DEMO_MODE) {
    const badges = read<string[]>(LS.badges, ['Founder’s Crown', 'Neon Halo'])
    if (!badges.includes(badge)) throw new Error('Tu ne possèdes pas ce badge')
    write(LS.badges, badges.filter((b) => b !== badge))
    const listing: MarketListing = {
      id: uid(),
      seller_id: userId,
      seller_name: userName,
      kind: 'badge',
      payload: badge,
      price_sparks: price,
      status: 'open',
      created_at: new Date().toISOString(),
    }
    write(LS.listings, [listing, ...read<MarketListing[]>(LS.listings, SEED_LISTINGS)])
    return listing
  }
  const { data, error } = await supabase!.rpc('list_badge', { p_badge: badge, p_price: price })
  if (error) throw error
  return { id: data as string, seller_id: userId, seller_name: userName, kind: 'badge', payload: badge, price_sparks: price, status: 'open', created_at: new Date().toISOString() }
}

/** Achat atomique : débit acheteur + livraison + clôture, indivisible. */
export async function buyListing(userId: string, listingId: string): Promise<{ wallet: Wallet; badge: string }> {
  if (DEMO_MODE) {
    const listings = read<MarketListing[]>(LS.listings, SEED_LISTINGS)
    const listing = listings.find((l) => l.id === listingId)
    if (!listing || listing.status !== 'open') throw new Error('Annonce indisponible')
    if (listing.seller_id === userId) throw new Error('Achat de sa propre annonce interdit')
    const w = demoWallet(userId)
    if (w.sparks < listing.price_sparks) throw new Error('Solde insuffisant')
    // mutation atomique-like (synchrone, pas d'await entre lecture et écriture)
    const wallet: Wallet = { ...w, sparks: w.sparks - listing.price_sparks }
    write(LS.wallet, wallet)
    const badges = read<string[]>(LS.badges, [])
    if (!badges.includes(listing.payload)) write(LS.badges, [...badges, listing.payload])
    write(LS.listings, listings.map((l) => (l.id === listingId ? { ...l, status: 'sold' as const } : l)))
    return { wallet, badge: listing.payload }
  }
  const { error } = await supabase!.rpc('buy_listing', { p_listing: listingId })
  if (error) throw error
  const wallet = await fetchWallet(userId)
  return { wallet, badge: '' }
}

// ── Shadow Profile (visiteurs masqués) ──────────────────────────
const SHADOW_VISITORS = ['un compte vérifié ✦', 'une Star de Showbiz', 'quelqu’un que tu suis', 'un Pionnier #—']

export async function fetchProfileViews(targetId: string): Promise<ProfileView[]> {
  if (DEMO_MODE) {
    const stored = read<ProfileView[] | null>(LS.views, null)
    if (stored) return stored
    const seeded: ProfileView[] = SHADOW_VISITORS.map((name, i) => ({
      id: uid(),
      viewer_id: 'shadow_' + i,
      viewer_name: name,
      target_id: targetId,
      revealed: false,
      created_at: new Date(Date.now() - (i + 1) * 1_200_000).toISOString(),
    }))
    write(LS.views, seeded)
    return seeded
  }
  const { data } = await supabase!
    .from('profile_views')
    .select('*, viewer:profiles!viewer_id(display_name)')
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
  return ((data ?? []) as (ProfileView & { viewer?: { display_name: string } })[]).map((v) => ({
    ...v,
    viewer_name: v.revealed ? v.viewer?.display_name ?? 'Inconnu' : 'Profil masqué',
  }))
}

/** Dépense des Sparks pour révéler un visiteur (sink déflationniste). */
export async function revealViewer(userId: string, viewId: string, cost = 50): Promise<{ wallet: Wallet; viewer: string }> {
  if (DEMO_MODE) {
    const w = demoWallet(userId)
    if (w.sparks < cost) throw new Error('Solde insuffisant')
    const wallet: Wallet = { ...w, sparks: w.sparks - cost }
    write(LS.wallet, wallet)
    const views = read<ProfileView[]>(LS.views, [])
    const view = views.find((v) => v.id === viewId)
    const realName = ['NOVA', 'KENZO', 'Zayn', 'Mia Rose'][viewId.length % 4]
    write(LS.views, views.map((v) => (v.id === viewId ? { ...v, revealed: true, viewer_name: realName } : v)))
    return { wallet, viewer: view ? realName : 'Inconnu' }
  }
  const { data, error } = await supabase!.rpc('reveal_viewer', { p_view: viewId, p_cost: cost })
  if (error) throw error
  const wallet = await fetchWallet(userId)
  return { wallet, viewer: (data as string) ?? '' }
}
