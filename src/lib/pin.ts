// ─────────────────────────────────────────────────────────────
// Verrou par code PIN (4 chiffres) — FLEX Lite.
// On ne stocke JAMAIS le PIN en clair : seulement son empreinte SHA-256
// (salée par l'auteur). Le déverrouillage compare les empreintes.
// v1 = verrou d'affichage. Le verrou cryptographique réel (stockage privé
// + URL signées via RPC) viendra en v2.
// ─────────────────────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Empreinte d'un PIN (salée par l'identifiant de l'auteur). */
export function pinHash(pin: string, salt = ''): Promise<string> {
  return sha256(`flex.pin.v1.${salt}.${pin}`)
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}
