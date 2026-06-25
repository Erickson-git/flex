import { DEMO_MODE, supabase } from './supabase'
import { applyArenaDelta, spendSparks } from './economy'
import type { Profile } from './types'
import type { Provider } from './premium'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// Retrait des Sparks en FCFA (mobile money Moov / Flooz).
// Économie créateur : l'inverse du tunnel d'achat (premium.ts).
//
// Demander un retrait DÉBITE les Sparks immédiatement (séquestre), puis
// l'admin envoie l'argent à la main et marque « payé ». Un refus recrédite.
// En PROD : RPC `security definer` atomiques (verrous). En DÉMO : localStorage.
// ─────────────────────────────────────────────────────────────

/** Taux de conversion au retrait : 1 FCFA = 5 Sparks (doit refléter le SQL). */
export const SPARKS_PER_FCFA = 5
/** Retrait minimum, en Sparks (= 2 000 FCFA). Doit refléter le SQL. */
export const MIN_SPARKS = 10000

/** FCFA réellement reçus pour un nombre de Sparks (arrondi à l'entier inférieur). */
export function fcfaFor(sparks: number): number {
  return Math.floor(sparks / SPARKS_PER_FCFA)
}
/** Sparks effectivement débités (multiple exact du taux) pour un montant demandé. */
export function effectiveSparks(sparks: number): number {
  return fcfaFor(sparks) * SPARKS_PER_FCFA
}

export interface PayoutRequest {
  id: string
  user_id: string
  user_name?: string
  sparks_amount: number
  amount_fcfa: number
  provider: Provider
  payout_number: string
  status: 'pending' | 'paid' | 'rejected'
  admin_note?: string | null
  created_at: string
}

const LS_PAYOUTS = 'flex.payouts'
function readPayouts(): PayoutRequest[] {
  try {
    return JSON.parse(localStorage.getItem(LS_PAYOUTS) || '[]') as PayoutRequest[]
  } catch {
    return []
  }
}
function writePayouts(p: PayoutRequest[]) {
  try {
    localStorage.setItem(LS_PAYOUTS, JSON.stringify(p))
  } catch {
    /* quota */
  }
}

/**
 * Crée une demande de retrait. Débite (séquestre) les Sparks immédiatement.
 * Le montant FCFA est recalculé ici (et revérifié serveur) à partir du taux.
 */
export async function requestPayout(
  me: Profile,
  sparks: number,
  provider: Provider,
  payoutNumber: string,
): Promise<PayoutRequest> {
  const number = payoutNumber.trim()
  if (!number) throw new Error('Numéro requis')
  if (sparks < MIN_SPARKS) throw new Error(`Minimum de retrait : ${MIN_SPARKS.toLocaleString('fr')} Sparks`)
  const held = effectiveSparks(sparks)
  const fcfa = fcfaFor(sparks)
  if (held <= 0 || fcfa <= 0) throw new Error('Montant trop faible')

  if (DEMO_MODE) {
    // Débit vérifié (lève « Solde insuffisant » si besoin) = séquestre local.
    await spendSparks(me.id, held, 'payout_hold')
    const payout: PayoutRequest = {
      id: uid(),
      user_id: me.id,
      user_name: me.display_name,
      sparks_amount: held,
      amount_fcfa: fcfa,
      provider,
      payout_number: number,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    writePayouts([payout, ...readPayouts()])
    return payout
  }

  const { data, error } = await supabase!.rpc('request_payout', {
    p_sparks: held,
    p_provider: provider,
    p_number: number,
  })
  if (error) throw error
  return {
    id: data as string,
    user_id: me.id,
    user_name: me.display_name,
    sparks_amount: held,
    amount_fcfa: fcfa,
    provider,
    payout_number: number,
    status: 'pending',
    created_at: new Date().toISOString(),
  }
}

/** Mes demandes de retrait (historique, tous statuts). */
export async function fetchMyPayouts(userId: string): Promise<PayoutRequest[]> {
  if (DEMO_MODE) return readPayouts().filter((p) => p.user_id === userId)
  const { data, error } = await supabase!
    .from('payout_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PayoutRequest[]
}

// ── Admin ───────────────────────────────────────────────────────
export async function fetchPendingPayouts(): Promise<PayoutRequest[]> {
  if (DEMO_MODE) return readPayouts().filter((p) => p.status === 'pending')
  const { data, error } = await supabase!
    .from('payout_requests')
    .select('*, user:profiles!user_id(display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as (PayoutRequest & { user?: { display_name: string } })[]).map((p) => ({
    ...p,
    user_name: p.user?.display_name,
  }))
}

/** Marque payé (true) ou rejette + rembourse (false). En démo, recrédite localement. */
export async function reviewPayout(payout: PayoutRequest, approve: boolean, note?: string): Promise<void> {
  if (DEMO_MODE) {
    if (!approve) await applyArenaDelta(payout.user_id, payout.sparks_amount) // remboursement
    writePayouts(
      readPayouts().map((p) =>
        p.id === payout.id
          ? { ...p, status: approve ? 'paid' : 'rejected', admin_note: note ?? null }
          : p,
      ),
    )
    return
  }
  const { error } = await supabase!.rpc('review_payout', {
    p_payout: payout.id,
    p_approve: approve,
    p_note: note ?? null,
  })
  if (error) throw error
}
