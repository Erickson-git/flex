import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { currentEmail, secureAccount } from '@/lib/account'
import { checkPassword, STRENGTH_COLORS } from '@/lib/password'
import { BrandLogo } from './BrandLogo'
import { haptic } from '@/lib/utils'

/**
 * Garantit que CHAQUE compte (hors invité) possède un mot de passe.
 * Un ancien compte sans identité (créé avant cette règle → aucun email/mot de
 * passe) est bloqué jusqu'à en définir un. Email/téléphone restent optionnels.
 */
export function PasswordGate() {
  const me = useAuth((s) => s.me)
  const [needs, setNeeds] = useState<boolean | null>(null) // null = vérif en cours
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    if (!me || me.is_guest) {
      setNeeds(false)
      return
    }
    // Pas d'email rattaché = compte anonyme sans mot de passe → on l'exige.
    currentEmail()
      .then((e) => active && setNeeds(!e))
      .catch(() => active && setNeeds(false))
    return () => {
      active = false
    }
  }, [me?.id, me?.is_guest])

  if (!me || me.is_guest || done || needs === null || needs === false) return null

  const check = checkPassword(pwd)
  const match = pwd === pwd2
  const canSubmit = check.ok && match && !busy

  async function submit() {
    if (!canSubmit || !me) return
    setBusy(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      await secureAccount(`${me.username.toLowerCase()}@flex.app`, pwd)
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec. Réessaie.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[125] flex flex-col items-center overflow-y-auto bg-ink-900 px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex justify-center">
          <BrandLogo size={96} baseline={false} />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-extrabold">Sécurise ton compte</h1>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Un mot de passe est désormais obligatoire pour protéger ton compte
          <span className="text-white"> @{me.username}</span>. Définis-le pour continuer.
        </p>

        <div className="mt-7 space-y-4">
          <div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Choisis un mot de passe"
                className="input-luxe pl-12 pr-12"
              />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500" aria-label={showPwd ? 'Masquer' : 'Afficher'}>
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {pwd.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={'h-1.5 flex-1 rounded-full ' + (i < check.score ? STRENGTH_COLORS[check.score] : 'bg-white/10')} />
                  ))}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Force : <span className="font-semibold text-zinc-300">{check.label}</span>
                  {check.issues.length > 0 && <span className="text-zinc-600"> · {check.issues.join(', ')}</span>}
                </div>
              </div>
            )}
          </div>

          <input
            type={showPwd ? 'text' : 'password'}
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Confirme le mot de passe"
            className="input-luxe"
          />
          {pwd2.length > 0 && !match && <p className="text-sm text-flex-pink">Les mots de passe diffèrent.</p>}
          {err && <p className="text-sm text-flex-pink">{err}</p>}

          <button onClick={submit} disabled={!canSubmit} className="btn-gold w-full text-lg disabled:opacity-40">
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Sécuriser mon compte'}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Tu te connecteras avec ton pseudo + ce mot de passe.
          </p>
        </div>
      </div>
    </div>
  )
}
