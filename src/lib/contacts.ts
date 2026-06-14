import { DEMO_MODE, supabase } from './supabase'
import type { Profile } from './types'

// ─────────────────────────────────────────────────────────────
// Découverte par les contacts du téléphone : "ceux qui ont ton numéro te
// retrouvent". On lit les numéros du carnet d'adresses (Contact Picker API,
// avec l'autorisation explicite de l'utilisateur) et on cherche les comptes
// FLEX correspondants par numéro. Disponible sur Android/Chrome installé ;
// non supporté sur iOS Safari (pas d'API) → on masque le bouton.
// ─────────────────────────────────────────────────────────────

type ContactsNav = Navigator & {
  contacts?: {
    select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ tel?: string[] }>>
  }
}

/** L'appareil permet-il de choisir des contacts (Contact Picker API) ? */
export function contactsSupported(): boolean {
  const nav = navigator as ContactsNav
  return !!nav.contacts?.select && 'ContactsManager' in window
}

/** Ouvre le sélecteur de contacts → renvoie les numéros (chiffres seuls, dédupliqués). */
export async function pickContactNumbers(): Promise<string[]> {
  const nav = navigator as ContactsNav
  if (!nav.contacts?.select) throw new Error("Import des contacts non supporté sur cet appareil.")
  const list = await nav.contacts.select(['tel'], { multiple: true })
  const set = new Set<string>()
  for (const c of list) {
    for (const t of c.tel ?? []) {
      const d = String(t).replace(/\D/g, '')
      if (d.length >= 6) set.add(d)
    }
  }
  return [...set]
}

/** Cherche les comptes FLEX dont le numéro correspond à l'un des contacts. */
export async function findContactsOnFlex(digits: string[]): Promise<Profile[]> {
  if (DEMO_MODE || !supabase || !digits.length) return []
  const { data, error } = await supabase.rpc('find_contacts_on_flex', { p_digits: digits })
  if (error) throw error
  return (data ?? []) as Profile[]
}
