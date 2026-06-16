import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Récupération de compte : on garde l'inscription anonyme ultra-rapide,
// mais l'utilisateur peut RATTACHER un email + mot de passe à son compte
// anonyme (Supabase upgrade le compte en permanent) → il devient
// récupérable depuis n'importe quel appareil.
// ─────────────────────────────────────────────────────────────

export async function currentEmail(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

/** Rattache un email + mot de passe au compte courant (anonyme → permanent). */
export async function secureAccount(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.auth.updateUser({ email, password })
  if (error) throw error
}

/** Connexion sur un nouvel appareil avec l'email + mot de passe rattachés. */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────
// Mot de passe oublié — récupération SÉCURISÉE par lien email.
// SEUL le propriétaire de l'email enregistré reçoit le lien → personne ne
// peut réinitialiser le mot de passe d'autrui. Le lien est à usage unique et
// expire (géré par Supabase). On ne révèle jamais si un email existe ou non
// (anti-énumération), pour ne pas aider un attaquant.
// ─────────────────────────────────────────────────────────────

/** Envoie un lien de réinitialisation à l'email (si un compte y est associé). */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const redirectTo = `${window.location.origin}/reset`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) throw error
}

/** Définit un nouveau mot de passe (depuis la session de récupération du lien). */
export async function updatePassword(newPassword: string): Promise<void> {
  if (!supabase) throw new Error('Backend indisponible')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  // Sécurité : on invalide les AUTRES sessions (si un intrus était connecté,
  // il est éjecté). Best-effort selon la version du SDK.
  try {
    await (supabase.auth as unknown as { signOut: (o: { scope: string }) => Promise<unknown> }).signOut({ scope: 'others' })
  } catch {
    /* scope 'others' non supporté : on ignore */
  }
}

/** Vérifie qu'on est bien dans une session de récupération valide. */
export async function hasActiveSession(): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

/**
 * Le compte courant est-il ANONYME (= sans aucun identifiant : pas de mot de
 * passe) ? Vrai uniquement pour les anciens comptes jamais sécurisés.
 * Un compte avec mot de passe (email/synthétique ou téléphone) renvoie false
 * → on ne lui redemande JAMAIS de créer un mot de passe.
 */
export async function isAnonymousAccount(): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.auth.getUser()
  const u = data.user as (NonNullable<typeof data.user> & { is_anonymous?: boolean }) | null
  if (!u) return false
  if (u.is_anonymous === true) return true
  // Repli : aucun email ET aucun téléphone rattachés = pas de mot de passe.
  return !u.email && !u.phone
}
