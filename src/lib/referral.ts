import { DEMO_MODE, supabase } from './supabase'
import { applyArenaDelta } from './economy'
import type { Profile } from './types'

// ─────────────────────────────────────────────────────────────
// Moteur de viralité : liens d'invitation uniques + bonus de parrainage.
// flesh.app/invite/<pseudo> → on mémorise le parrain, et à l'inscription
// parrain & filleul gagnent 50 Sparks (RPC atomique en prod).
// ─────────────────────────────────────────────────────────────

const PENDING = 'flex.pendingRef'

export function inviteLink(username: string): string {
  const origin = typeof location !== 'undefined' ? location.origin : 'https://flesh.app'
  return `${origin}/invite/${encodeURIComponent(username)}`
}

export function captureReferral(code: string) {
  try {
    if (code) localStorage.setItem(PENDING, code.toLowerCase())
  } catch {
    /* no-op */
  }
}

export function pendingReferral(): string | null {
  try {
    return localStorage.getItem(PENDING)
  } catch {
    return null
  }
}

function clearPending() {
  try {
    localStorage.removeItem(PENDING)
  } catch {
    /* no-op */
  }
}

/**
 * À appeler juste après l'inscription. Lie le filleul au parrain et crédite
 * les 50 Sparks de bienvenue. Renvoie le pseudo du parrain si succès.
 */
export async function redeemPendingReferral(me: Profile): Promise<string | null> {
  const code = pendingReferral()
  if (!code || code === me.username) {
    clearPending()
    return null
  }
  try {
    if (DEMO_MODE) {
      await applyArenaDelta(me.id, 50) // bonus filleul (le parrain est crédité côté serveur en prod)
      clearPending()
      return code
    }
    const { data, error } = await supabase!.rpc('redeem_referral', { p_referrer: code })
    clearPending()
    if (error || !data) return null
    return code
  } catch {
    clearPending()
    return null
  }
}
