import { useEffect, useState } from 'react'
import { Loader2, ScanFace } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { biometricEnabled, biometricSupported, clearFaceAccount, disableBiometric, registerBiometric, setFaceAccount } from '@/lib/biometric'
import { haptic } from '@/lib/utils'

/**
 * Carte d'activation du verrou biométrique (scanner facial / empreinte).
 * Utilise le capteur sécurisé de l'appareil (Face ID, Windows Hello, Android).
 */
export function BiometricToggle() {
  const me = useAuth((s) => s.me)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    biometricSupported().then(setSupported)
    if (me) setOn(biometricEnabled(me.id))
  }, [me?.id])

  if (!me || supported === null) return null
  if (!supported) return null // appareil sans capteur biométrique → on masque

  async function toggle() {
    if (busy || !me) return
    haptic(10)
    setBusy(true)
    setMsg(null)
    try {
      if (on) {
        disableBiometric(me.id)
        clearFaceAccount()
        setOn(false)
      } else {
        await registerBiometric(me.id, me.username || me.display_name || 'FLEX')
        setFaceAccount(me.id) // active aussi la « connexion au visage »
        setOn(true)
        setMsg('Activé : déverrouille et connecte-toi avec ton visage/empreinte sur cet appareil.')
      }
    } catch {
      setMsg('Activation refusée ou annulée.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={
          'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-50 ' +
          (on ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]')
        }
      >
        <div className="flex items-center gap-3">
          <ScanFace className={on ? 'h-5 w-5 text-emerald-400' : 'h-5 w-5 text-gold'} />
          <div>
            <div className="text-sm font-bold text-white">Verrou facial / empreinte</div>
            <div className="text-xs text-zinc-500">Déverrouille FLEX avec ton visage (Face ID…).</div>
          </div>
        </div>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        ) : (
          <span className={'relative h-6 w-11 rounded-full transition ' + (on ? 'bg-emerald-500' : 'bg-white/15')}>
            <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} />
          </span>
        )}
      </button>
      {msg && <p className="mt-1.5 text-center text-xs text-zinc-500">{msg}</p>}
    </div>
  )
}
