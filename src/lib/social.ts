import { DEMO_MODE, supabase } from './supabase'
import { DEMO_SHOP, DEMO_TEUFS } from './demoData'
import type { Profile, ShopItem, Squad, SparkResult } from './types'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// Modules sociaux : Match Spark (drague), Teufs (events), Flex Shop.
// Réutilise le moteur de chat (room_id) pour tous les salons.
// ─────────────────────────────────────────────────────────────

const SPARK_TTL_MS = 24 * 3600_000

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, v: T) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* quota */
  }
}

/** Salon de drague déterministe pour une paire (ordre indépendant). */
export function sparkRoomId(a: string, b: string): string {
  return 'spark_' + [a, b].sort().join('_')
}

/**
 * "Sparker" un profil. Si réciproque → crée un salon éphémère 24 h.
 * En démo, la star "spark en retour" pour offrir l'effet de match immédiat.
 */
export async function sparkProfile(me: Profile, target: Profile): Promise<SparkResult> {
  const sent = read<string[]>('flex.sparks.sent', [])
  if (!sent.includes(target.id)) write('flex.sparks.sent', [...sent, target.id])

  if (DEMO_MODE) {
    const roomId = sparkRoomId(me.id, target.id)
    write(`flex.sparkroom.${roomId}`, { expires_at: Date.now() + SPARK_TTL_MS, peer: target.display_name })
    return { matched: true, room_id: roomId } // match garanti en démo
  }

  // Prod : enregistre le spark ; le match est effectif si l'autre a sparké aussi.
  await supabase!.from('sparks_match').upsert({ from_id: me.id, to_id: target.id })
  const { data } = await supabase!
    .from('sparks_match')
    .select('from_id')
    .eq('from_id', target.id)
    .eq('to_id', me.id)
    .maybeSingle()
  const matched = !!data
  return { matched, room_id: matched ? sparkRoomId(me.id, target.id) : undefined }
}

/** Temps restant (ms) avant autodestruction du salon de drague. */
export function sparkRoomTimeLeft(roomId: string): number {
  const meta = read<{ expires_at: number } | null>(`flex.sparkroom.${roomId}`, null)
  if (!meta) return 0
  return Math.max(0, meta.expires_at - Date.now())
}

/** Prolonge le salon de 24 h (sinon il s'efface). */
export function extendSparkRoom(roomId: string) {
  write(`flex.sparkroom.${roomId}`, { expires_at: Date.now() + SPARK_TTL_MS })
}

// ── Teufs (événements) ──────────────────────────────────────────
export function getTeufs(): Squad[] {
  const custom = read<Squad[]>('flex.teufs', [])
  return [...custom, ...DEMO_TEUFS]
}

export function createTeuf(input: Omit<Squad, 'id' | 'members_count' | 'kind'>): Squad {
  const teuf: Squad = { ...input, id: 'tf_' + uid(), members_count: 1, kind: 'teuf' }
  write('flex.teufs', [teuf, ...read<Squad[]>('flex.teufs', [])])
  return teuf
}

// ── Flex Shop ───────────────────────────────────────────────────
export function getShopItems(sellerId?: string): ShopItem[] {
  const custom = read<ShopItem[]>('flex.shop', [])
  const all = [...custom, ...DEMO_SHOP]
  return sellerId ? all.filter((i) => i.seller_id === sellerId) : all
}

export function addShopItem(item: Omit<ShopItem, 'id'>): ShopItem {
  const it: ShopItem = { ...item, id: 'it_' + uid() }
  write('flex.shop', [it, ...read<ShopItem[]>('flex.shop', [])])
  return it
}
