// ─────────────────────────────────────────────────────────────
// Anti-bruteforce des connexions (côté appareil).
//
// Après plusieurs échecs de connexion, on impose un délai d'attente
// croissant — ralentit fortement les essais automatiques de mots de passe
// (utile tant que des comptes gardent le mot de passe par défaut).
// Note : c'est une 1re barrière côté client ; Supabase applique en plus ses
// propres limites côté serveur. Une vraie protection distribuée se fait serveur.
// ─────────────────────────────────────────────────────────────

const KEY = 'flex.login.guard'
const FREE_TRIES = 5 // échecs tolérés avant le 1er verrou
const BASE_LOCK_MS = 30_000 // 30 s, puis x2 à chaque échec supplémentaire
const MAX_LOCK_MS = 15 * 60_000 // plafond : 15 min

interface GuardState {
  fails: number
  lockedUntil: number // ms epoch
}

function read(): GuardState {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '') as GuardState
  } catch {
    return { fails: 0, lockedUntil: 0 }
  }
}
function write(s: GuardState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* quota */
  }
}

/** Secondes restantes avant de pouvoir réessayer (0 si non verrouillé). */
export function lockRemaining(now = Date.now()): number {
  const { lockedUntil } = read()
  return lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0
}

/** Enregistre un échec de connexion → calcule le prochain verrou. */
export function recordLoginFailure(now = Date.now()): void {
  const s = read()
  s.fails += 1
  if (s.fails > FREE_TRIES) {
    const over = s.fails - FREE_TRIES // 1, 2, 3…
    const lock = Math.min(BASE_LOCK_MS * 2 ** (over - 1), MAX_LOCK_MS)
    s.lockedUntil = now + lock
  }
  write(s)
}

/** Connexion réussie → on remet le compteur à zéro. */
export function recordLoginSuccess(): void {
  write({ fails: 0, lockedUntil: 0 })
}
