import { useEffect, useRef } from 'react'
import { useAuth } from '@/store/useAuth'
import { isAnonymousAccount, secureAccount } from '@/lib/account'
import { toast } from '@/lib/toast'

/** Mot de passe attribué par défaut aux anciens comptes sans identité. */
const DEFAULT_PWD = '0000'

/**
 * Aucun écran bloquant. Tout compte sans mot de passe (anciens comptes anonymes
 * ET invités, qui ont chacun leur propre identifiant provisoire) reçoit
 * silencieusement le mot de passe par défaut « 0000 » — entièrement optionnel,
 * modifiable à tout moment depuis le profil. Chacun peut donc se reconnecter
 * avec son pseudo + 0000. Le composant ne rend jamais d'interface.
 */
export function PasswordGate() {
  const me = useAuth((s) => s.me)
  const handled = useRef(false)

  useEffect(() => {
    if (!me || handled.current) return
    handled.current = true
    let active = true
    ;(async () => {
      try {
        const anon = await isAnonymousAccount()
        if (!active || !anon) return
        // Connexion future possible par pseudo + 0000 (l'utilisateur changera
        // ce mot de passe quand il veut depuis « Sécuriser mon compte »).
        await secureAccount(`${me.username.toLowerCase()}@flex.app`, DEFAULT_PWD)
        // Rappel discret pour les vrais comptes ; silencieux pour les invités.
        if (!me.is_guest) {
          toast('Mot de passe par défaut : 0000 — change-le quand tu veux dans Profil.', 'info')
        }
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
