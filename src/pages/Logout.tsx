import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/store/useAuth'

/**
 * Déconnexion par lien (/logout) : ferme la session courante puis renvoie vers
 * la page de connexion (accueil, 3 options). Pratique pour repasser sur l'écran
 * de choix Créer / Invité / Compte existant sans vider le cache à la main.
 */
export default function Logout() {
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        await signOut()
      } finally {
        navigate('/', { replace: true })
      }
    })()
  }, [signOut, navigate])

  return (
    <div className="grid min-h-[100dvh] place-items-center text-zinc-400">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" /> Déconnexion…
      </div>
    </div>
  )
}
