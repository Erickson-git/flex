import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { currentEmail, secureAccount } from '@/lib/account'
import { updateMyProfile } from '@/lib/api'
import { haptic } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PWD = 6

/**
 * Mise à jour OBLIGATOIRE des comptes EXISTANTS : avant de pouvoir continuer à
 * utiliser FLEX, un compte créé avant la nouvelle version doit compléter ses
 * informations manquantes (email + mot de passe pour être récupérable, et
 * numéro de téléphone). Les invités et les comptes déjà complets passent direct.
 *
 * Bloque tout l'écran tant que ce n'est pas fait.
 */
export function AccountCompletionGate() {
  const me = useAuth((s) => s.me)
  const setMe = useAuth((s) => s.setMe)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [hasEmail, setHasEmail] = useState<boolean | null>(null) // null = en cours de vérif
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    if (!me || me.is_guest) {
      setHasEmail(true)
      return
    }
    currentEmail()
      .then((e) => {
        if (!active) return
        setHasEmail(!!e)
        if (e) setEmail(e)
      })
      .catch(() => active && setHasEmail(false))
    return () => {
      active = false
    }
  }, [me?.id, me?.is_guest])

  if (!me || me.is_guest || done || hasEmail === null) return null
  const needEmail = !hasEmail
  const needPhone = !me.phone
  if (!needEmail && !needPhone) return null

  const emailOk = !needEmail || EMAIL_RE.test(email.trim())
  const pwdOk = !needEmail || pwd.length >= MIN_PWD
  const phoneOk = !needPhone || phone.replace(/\D/g, '').length >= 8
  const canSubmit = emailOk && pwdOk && phoneOk && !busy

  async function submit() {
    if (!canSubmit || !me) return
    setBusy(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      if (needEmail) await secureAccount(email.trim(), pwd)
      if (needPhone) {
        const updated = await updateMyProfile(me, { phone: phone.trim() })
        setMe(updated)
      }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec. Réessaie.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col overflow-y-auto bg-ink-900 px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/10">
          <ShieldCheck className="h-7 w-7 text-gold" />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-extrabold">Complète ton compte</h1>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Nouvelle mise à jour FLEX : pour continuer, ajoute les informations
          manquantes. Ton compte sera sécurisé et récupérable partout.
        </p>

        <div className="mt-7 space-y-4">
          {needEmail && (
            <>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ton email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="input-luxe pl-12"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Définir un mot de passe"
                  className="input-luxe pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {pwd.length > 0 && !pwdOk && (
                <p className="text-sm text-flex-pink">Au moins {MIN_PWD} caractères.</p>
              )}
            </>
          )}

          {needPhone && (
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ton numéro (ex. +228 90 12 34 56)"
                autoComplete="tel"
                className="input-luxe pl-12"
              />
            </div>
          )}

          {err && <p className="text-sm text-flex-pink">{err}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="btn-gold flex w-full items-center justify-center gap-2 text-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continuer'}
          </button>
          <p className="text-center text-xs text-zinc-600">Cette étape est obligatoire pour continuer.</p>
        </div>
      </div>
    </div>
  )
}
