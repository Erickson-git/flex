import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { currentEmail, secureAccount } from '@/lib/account'
import { haptic } from '@/lib/utils'

/**
 * Carte « Sécuriser mon compte » : rattache un email + mot de passe au
 * compte anonyme pour le rendre récupérable sur tous les appareils.
 * Affiche « Compte sécurisé » une fois fait.
 */
export function SecureAccountCard() {
  const [loading, setLoading] = useState(true)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    currentEmail()
      .then((e) => setSavedEmail(e))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!/.+@.+\..+/.test(email.trim())) return setErr('Email invalide.')
    if (pwd.length < 6) return setErr('Mot de passe : 6 caractères minimum.')
    setBusy(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      await secureAccount(email.trim(), pwd)
      setDone(true)
      setSavedEmail(email.trim())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  if (savedEmail) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <div className="font-semibold text-white">Compte sécurisé ✓</div>
          <div className="truncate text-xs text-zinc-400">
            {done ? 'Vérifie ta boîte mail pour confirmer. ' : ''}Récupérable via {savedEmail}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-gold/30 bg-gold/[0.05] p-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left">
          <ShieldCheck className="h-5 w-5 shrink-0 text-gold" />
          <div>
            <div className="font-semibold text-white">Sécurise ton compte</div>
            <div className="text-xs text-zinc-400">Ajoute un email pour le retrouver sur tout appareil.</div>
          </div>
        </button>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-gold" /> Sécuriser mon compte
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ton email"
            autoCapitalize="none"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
          />
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe (6+ caractères)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
          />
          {err && <p className="text-sm text-flex-pink">{err}</p>}
          <button onClick={save} disabled={busy} className="btn-gold w-full disabled:opacity-50">
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Sécuriser'}
          </button>
        </div>
      )}
    </div>
  )
}
