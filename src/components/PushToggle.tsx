import { useState } from 'react'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { enablePush, pushPermission, pushSupported } from '@/lib/push'
import { haptic } from '@/lib/utils'

// Carte d'activation des notifications push (messages & appels, même app fermée).
export function PushToggle() {
  const [perm, setPerm] = useState(pushPermission())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!pushSupported()) return null

  if (perm === 'granted') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm font-semibold text-emerald-300">
        <BellRing className="h-4 w-4" /> Notifications activées
      </div>
    )
  }

  async function activate() {
    haptic(10)
    setBusy(true)
    setMsg(null)
    const r = await enablePush()
    setBusy(false)
    setPerm(pushPermission())
    if (r === 'denied') setMsg('Autorisation refusée — réactive-la dans les réglages du navigateur.')
    else if (r === 'unsupported') setMsg("Sur iPhone : ajoute d'abord FLEX à l'écran d'accueil, puis réessaie.")
    else if (r === 'error') setMsg('Échec — réessaie.')
  }

  return (
    <div className="mt-3">
      <button
        onClick={activate}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-gold/5 py-3 text-sm font-bold text-gold transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
        Activer les notifications (messages & appels)
      </button>
      {msg && <p className="mt-1.5 text-center text-xs text-zinc-500">{msg}</p>}
    </div>
  )
}
