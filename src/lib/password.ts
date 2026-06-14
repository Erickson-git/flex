// ─────────────────────────────────────────────────────────────
// Règles de complexité du mot de passe (connexion/inscription sécurisées).
// Exigences minimales : 8 caractères, au moins une lettre ET un chiffre.
// Le score (0..4) alimente l'indicateur de force.
// ─────────────────────────────────────────────────────────────

export interface PwdCheck {
  ok: boolean
  score: number // 0..4
  label: string
  issues: string[]
}

export function checkPassword(pwd: string): PwdCheck {
  const issues: string[] = []
  if (pwd.length < 8) issues.push('8 caractères minimum')
  if (!/[a-zA-Z]/.test(pwd)) issues.push('au moins une lettre')
  if (!/[0-9]/.test(pwd)) issues.push('au moins un chiffre')

  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  score = Math.min(score, 4)

  const label = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'][score]
  return { ok: issues.length === 0, score, label, issues }
}

export const STRENGTH_COLORS = ['bg-flex-pink', 'bg-flex-pink', 'bg-gold', 'bg-emerald-400', 'bg-emerald-400']
