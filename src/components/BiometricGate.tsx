import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ScanFace } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { biometricEnabled, disableBiometric, verifyBiometric } from '@/lib/biometric'
import { BrandLogo } from './BrandLogo'
import { haptic } from '@/lib/utils'

/**
 * Verrou biométrique au démarrage : si l'utilisateur a activé le scanner facial,
 * l'app reste masquée tant qu'il n'a pas validé son visage / empreinte.
 * Soupape anti-blocage : « Se déconnecter » désactive le verrou local et sort.
 */
export function BiometricGate() {
  const me = useAuth((s) => s.me)
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)

  const enabled = !!me && biometricEnabled(me.id)

  const unlock = useCallback(async () => {
    if (!me || busy) return
    setBusy(true)
    setErr(false)
    try {
      const ok = await verifyBiometric(me.id)
      if (ok) {
        haptic([10, 30, 10])
        setUnlocked(true)
      } else {
        setErr(true)
      }
    } catch {
      setErr(true)
    } finally {
      setBusy(false)
    }
  }, [me, busy])

  // Tente le déverrouillage automatiquement à l'ouverture.
  useEffect(() => {
    if (enabled && !unlocked) unlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  if (!enabled || unlocked) return null

  return (
    <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-8 bg-ink-900 px-8 text-center">
      <BrandLogo size={120} />
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gold/10">
        <ScanFace className="h-10 w-10 text-gold" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-extrabold">FLEX est verrouillé</h1>
        <p className="mt-2 text-sm text-zinc-400">Déverrouille avec ton visage ou ton empreinte.</p>
        {err && <p className="mt-2 text-sm text-flex-pink">Échec — réessaie.</p>}
      </div>
      <button onClick={unlock} disabled={busy} className="btn-gold flex w-full max-w-xs items-center justify-center gap-2 text-lg disabled:opacity-50">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ScanFace className="h-5 w-5" /> Déverrouiller</>}
      </button>
      <button
        onClick={async () => {
          if (me) disableBiometric(me.id) // soupape : évite tout blocage définitif
          await signOut()
          navigate('/', { replace: true })
        }}
        className="text-sm font-semibold text-zinc-500"
      >
        Se déconnecter
      </button>
    </div>
  )
}
