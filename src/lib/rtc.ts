// ─────────────────────────────────────────────────────────────
// Configuration WebRTC partagée (appels 1-à-1 et appels de groupe).
//
// STUN : traversée NAT basique (suffit en Wi-Fi simple).
// TURN : RELAIS indispensable sur 4G / NAT strict / réseaux d'entreprise —
//        sans un TURN FIABLE, beaucoup d'appels « ne passent pas ».
//
// ⚠️ Le relais gratuit historique `openrelay.metered.ca` est devenu peu
//    fiable. Pour des appels stables, fournis ton propre TURN via les
//    variables d'environnement (Metered, Twilio, ou coturn auto-hébergé) :
//      VITE_TURN_URLS=turn:xxx:3478,turns:xxx:443?transport=tcp
//      VITE_TURN_USERNAME=...
//      VITE_TURN_CREDENTIAL=...
//    (à définir dans Vercel → Settings → Environment Variables, puis redéployer)
// ─────────────────────────────────────────────────────────────

const STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
]

function turnServers(): RTCIceServer[] {
  const urls = (import.meta.env.VITE_TURN_URLS as string | undefined)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const username = import.meta.env.VITE_TURN_USERNAME as string | undefined
  const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined

  // TURN fourni par l'environnement (recommandé : fiable).
  if (urls?.length && username && credential) {
    return [{ urls, username, credential }]
  }

  // Repli « best-effort » (peut être indisponible) — remplace-le par un vrai TURN.
  return [
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ]
}

/** Config ICE unique, utilisée par les appels 1-à-1 et de groupe. */
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: STUN }, ...turnServers()],
  iceCandidatePoolSize: 10,
}

/** Vrai si un TURN dédié (fiable) est configuré via l'environnement. */
export const HAS_DEDICATED_TURN = Boolean(
  (import.meta.env.VITE_TURN_URLS as string | undefined) &&
    import.meta.env.VITE_TURN_USERNAME &&
    import.meta.env.VITE_TURN_CREDENTIAL,
)
