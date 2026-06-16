// ─────────────────────────────────────────────────────────────
// Verrou biométrique (scanner facial / empreinte) via WebAuthn.
//
// On NE fait PAS de reconnaissance faciale "maison" via la caméra (trompable
// par une photo, lourde, peu fiable). On utilise le capteur sécurisé de
// l'APPAREIL (Face ID, Windows Hello, déverrouillage facial Android) exposé par
// WebAuthn : le visage/empreinte est vérifié par le matériel sécurisé du
// téléphone, et l'app reçoit une preuve cryptographique. Fiable + performant.
//
// Ici c'est un VERROU LOCAL (déverrouiller l'app/la galerie sur cet appareil).
// L'authentification serveur complète par passkey (Edge Function de
// vérification) est une évolution v2.
// ─────────────────────────────────────────────────────────────

const KEY = (uid: string) => `flex.biometric.${uid}`
const FACE_ACCT = 'flex.biometric.account' // dernier compte ayant activé le visage

/** Mémorise le compte utilisable par « connexion au visage » sur cet appareil. */
export function setFaceAccount(uid: string): void {
  localStorage.setItem(FACE_ACCT, uid)
}
export function getFaceAccount(): string | null {
  return localStorage.getItem(FACE_ACCT)
}
export function clearFaceAccount(): void {
  localStorage.removeItem(FACE_ACCT)
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

/** L'appareil a-t-il un authentificateur biométrique intégré (Face ID, etc.) ? */
export async function biometricSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function biometricEnabled(uid: string): boolean {
  return !!localStorage.getItem(KEY(uid))
}

export function disableBiometric(uid: string): void {
  localStorage.removeItem(KEY(uid))
}

/** Active le verrou : enregistre une clé liée au visage/empreinte de l'appareil. */
export async function registerBiometric(uid: string, name: string): Promise<void> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: location.hostname, name: 'FLEX' },
      user: { id: new TextEncoder().encode(uid), name, displayName: name },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // capteur intégré (Face ID…)
        userVerification: 'required', // exige le visage/empreinte
        residentKey: 'preferred',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Activation annulée.')
  localStorage.setItem(KEY(uid), toB64(cred.rawId))
}

/** Déverrouille : redemande le visage/empreinte. true si vérifié. */
export async function verifyBiometric(uid: string): Promise<boolean> {
  const stored = localStorage.getItem(KEY(uid))
  if (!stored) return false
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: fromB64(stored) as BufferSource, type: 'public-key' }],
      userVerification: 'required',
      timeout: 60_000,
      rpId: location.hostname,
    },
  })
  return !!assertion
}
