// ─────────────────────────────────────────────────────────────
// Préservation du lien d'origine (« deep link »).
//
// Quand une personne NON connectée ouvre un lien FLEX (profil partagé, post,
// n'importe quelle page), les gardes la renvoient d'abord vers l'accueil/
// connexion. On mémorise ici la destination voulue pour l'y emmener APRÈS
// connexion / création de compte / entrée en invité.
// ─────────────────────────────────────────────────────────────

const KEY = 'flex.redirect'

/** Routes d'auth/accueil qu'on ne mémorise jamais comme destination. */
const SKIP = ['/', '/signin', '/claim', '/welcome', '/forgot', '/reset']

/** Mémorise la page visée (ignore les pages d'auth/accueil). */
export function rememberRedirect(path: string): void {
  if (!path || SKIP.some((p) => path === p || path.startsWith(p + '?'))) return
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    /* no-op */
  }
}

/** Récupère ET consomme la destination mémorisée (null si aucune). */
export function takeRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) sessionStorage.removeItem(KEY)
    return v
  } catch {
    return null
  }
}
