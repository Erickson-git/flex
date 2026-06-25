import { useEffect, useRef } from 'react'
import { useAuth } from '@/store/useAuth'
import { isAnonymousAccount, secureAccount } from '@/lib/account'
import { toast } from '@/lib/toast'

/** Mot de passe attribué par défaut aux anciens comptes sans identité. */
const DEFAULT_PWD = '0000'

/**
 * Les anciens comptes (créés avant la règle du mot de passe → aucun email ni
 * mot de passe) ne sont PLUS bloqués. On leur attribue silencieusement un mot
 * de passe par défaut « 0000 » (entièrement optionnel : modifiable à tout
 * moment depuis le profil) et on affiche une petite notification de rappel.
 * Aucun écran bloquant : le composant ne rend jamais d'interface.
 */
export function PasswordGate() {
  const me = useAuth((s) => s.me)
  const handled = useRef(false)

  useEffect(() => {
    // Invités et comptes déjà sécurisés : rien à faire.
    if (!me || me.is_guest || handled.current) return
    handled.current = true
    let active = true
    ;(async () => {
      try {
        const anon = await isAnonymousAccount()
        if (!active || !anon) return
        // Connexion future possible par pseudo + 0000 (l'utilisateur changera
        // ce mot de passe quand il veut depuis « Sécuriser mon compte »).
        await secureAccount(`${me.username.toLowerCase()}@flex.app`, DEFAULT_PWD)
        toast('Mot de passe par défaut : 0000 — change-le quand tu veux dans Profil.', 'info')
      } catch {
        // Best-effort : en cas d'échec, on n'affiche rien et on ne bloque jamais.
        handled.current = false
      }
    })()
    return () => {
      active = false
    }
  }, [me?.id, me?.is_guest, me?.username])

  return null
}
