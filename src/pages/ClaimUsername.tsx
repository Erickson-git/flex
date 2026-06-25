import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock, Mail, Phone } from 'lucide-react'
import { claimUsername, isUsernameAvailable, updateMyProfile } from '@/lib/api'
import { secureAccount } from '@/lib/account'
import { redeemPendingReferral } from '@/lib/referral'
import { useAuth } from '@/store/useAuth'
import type { Profile } from '@/lib/types'
import { BrandLogo } from '@/components/BrandLogo'
import { checkPassword, STRENGTH_COLORS } from '@/lib/password'
import { haptic, validateUsername } from '@/lib/utils'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Au moins 8 chiffres (hors indicatif/espaces). */
const phoneDigits = (s: string) => s.replace(/\D/g, '')

/**
 * Revendication du pseudo + définition du mot de passe (compte sécurisé dès
 * l'inscription). Urgence + rareté :
 *  - vérification de disponibilité du pseudo en direct
 *  - email + mot de passe → le compte est récupérable depuis n'importe quel
 *    appareil dès sa création (au lieu d'attendre la carte « Sécuriser » du profil).
 */
export default function ClaimUsername() {
  const navigate = useNavigate()
  const setMe = useAuth((s) => s.setMe)
  const [value, setValue] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [spotsLeft] = useState(() => 100 - (6 + Math.floor((Date.now() / 1000) % 7)))
  // Si le pseudo a déjà été revendiqué (compte créé), un nouvel essai ne refait
  // QUE les étapes suivantes (téléphone + sécurisation), pas la création.
  const claimedRef = useRef(false)
  const meRef = useRef<Profile | null>(null)
  const referrerRef = useRef<string | null>(null)

  // Seul le PSEUDO est obligatoire. Mot de passe, email et téléphone sont
  // OPTIONNELS (complétables à tout moment) : valides seulement si remplis.
  const emailOk = !email.trim() || EMAIL_RE.test(email.trim())
  const pwdCheck = checkPassword(pwd)
  const pwdProvided = pwd.length > 0
  const pwdMatch = pwd === pwd2
  // Mot de passe optionnel : OK s'il est vide, sinon il doit être valide ET confirmé.
  const pwdOk = !pwdProvided || (pwdCheck.ok && pwdMatch)
  const phoneOk = !phone.trim() || phoneDigits(phone).length >= 8
  const canSubmit = status === 'available' && pwdOk && emailOk && phoneOk && !submitting

  // Vérification débouncée de disponibilité
  useEffect(() => {
    const u = value.trim().toLowerCase()
    if (!u) return setStatus('idle')
    const invalid = validateUsername(u)
    if (invalid) {
      setError(invalid)
      return setStatus('invalid')
    }
    setError(null)
    setStatus('checking')
    const t = setTimeout(async () => {
      const ok = await isUsernameAvailable(u)
      setStatus(ok ? 'available' : 'taken')
      if (ok) haptic(10)
    }, 450)
    return () => clearTimeout(t)
  }, [value])

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    haptic([10, 30, 10])
    try {
      // 1) Création du compte + pseudo (une seule fois).
      if (!claimedRef.current) {
        const me = await claimUsername(value)
        setMe(me)
        meRef.current = me
        claimedRef.current = true
        referrerRef.current = await redeemPendingReferral(me) // bonus parrain/filleul
      }
      // 2) Numéro de téléphone si fourni (recherche par numéro + récupération).
      if (meRef.current && phone.trim()) {
        const updated = await updateMyProfile(meRef.current, { phone: phone.trim() })
        setMe(updated)
        meRef.current = updated
      }
      // 3) Mot de passe + email → compte permanent (OPTIONNEL). Si l'utilisateur
      //    n'a pas défini de mot de passe, le compte reste anonyme mais
      //    fonctionnel : il pourra le sécuriser plus tard depuis son profil.
      //    Si un mot de passe est donné sans email, on génère un email interne
      //    `pseudo@flex.app` pour permettre la connexion par PSEUDO + mot de passe.
      if (pwdProvided) {
        const authEmail = email.trim() || `${value.trim().toLowerCase()}@flex.app`
        await secureAccount(authEmail, pwd)
      }
      navigate('/welcome', { replace: true, state: { referrer: referrerRef.current } })
    } catch (e) {
      // Le compte peut être créé mais la sécurisation a échoué (ex. email déjà
      // utilisé) : on garde claimedRef pour que le bouton ne refasse que l'étape 2.
      setError(
        e instanceof Error
          ? claimedRef.current
            ? `Mot de passe non enregistré : ${e.message}`
            : e.message
          : 'Erreur. Réessaie.',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="grain relative flex min-h-[100dvh] flex-col overflow-hidden px-6 pb-10 pt-8">
      {/* Halos d'ambiance luxueux */}
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-flex-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-28 h-64 w-64 rounded-full bg-flex-pink/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <BrandLogo size={96} baseline={false} animate />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-flex-pink/40 bg-flex-pink/10 px-4 py-1.5 text-xs font-semibold text-flex-pink"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-flex-pink" />
          Plus que {spotsLeft} places de Pionnier
        </motion.div>

        <h1 className="mt-4 text-center font-display text-3xl font-extrabold leading-tight">
          Crée ton <span className="text-gold-grad">compte</span>.
        </h1>
        <p className="mt-2 max-w-sm text-center text-sm text-zinc-400">
          Seul un <span className="text-white">pseudo</span> est requis. Mot de
          passe, email et téléphone sont optionnels — à compléter à tout moment.
        </p>
      </div>

      <div className="glass relative mx-auto mt-6 w-full max-w-sm space-y-4 rounded-3xl p-5 shadow-card">
        {/* Pseudo */}
        <div>
          <div className="relative">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-zinc-500">
              @
            </span>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder="ton_pseudo"
              maxLength={20}
              className="input-luxe pl-10 pr-12"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
              {status === 'available' && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400">
                  <Check className="h-6 w-6" strokeWidth={3} />
                </motion.span>
              )}
              {(status === 'taken' || status === 'invalid') && (
                <AlertCircle className="h-5 w-5 text-flex-pink" />
              )}
            </span>
          </div>
          <div className="mt-2 min-h-[1.1rem] text-sm">
            {status === 'available' && (
              <span className="font-semibold text-emerald-400">Libre ! Il est à toi. ✦</span>
            )}
            {status === 'taken' && <span className="text-flex-pink">Déjà pris. Trouve mieux 😏</span>}
          </div>
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ton email (optionnel — pour récupérer le compte)"
            className="input-luxe pl-12"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* Téléphone */}
        <div>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ton numéro (optionnel)"
              className="input-luxe pl-12"
              autoComplete="tel"
            />
          </div>
          <div className="mt-2 min-h-[1.1rem] text-sm">
            {phone.length > 0 && !phoneOk && (
              <span className="text-flex-pink">Numéro trop court (au moins 8 chiffres).</span>
            )}
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Mot de passe (optionnel)"
              className="input-luxe pl-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500"
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Indicateur de force */}
          {pwd.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={
                      'h-1.5 flex-1 rounded-full transition-colors ' +
                      (i < pwdCheck.score ? STRENGTH_COLORS[pwdCheck.score] : 'bg-white/10')
                    }
                  />
                ))}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Force : <span className="font-semibold text-zinc-300">{pwdCheck.label}</span>
                {pwdCheck.issues.length > 0 && <span className="text-zinc-600"> · {pwdCheck.issues.join(', ')}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation du mot de passe — seulement si un mot de passe est défini */}
        <div>
          {pwdProvided && (
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Confirme le mot de passe"
                className="input-luxe pl-12"
              />
            </div>
          )}
          <div className="mt-2 min-h-[1.1rem] text-sm">
            {pwdProvided && pwd2.length > 0 && !pwdMatch && (
              <span className="text-flex-pink">Les mots de passe diffèrent.</span>
            )}
            {error && <span className="text-flex-pink">{error}</span>}
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-5 w-full max-w-sm">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="btn-gold flex w-full items-center justify-center gap-2 text-lg disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrer dans FLEX'}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600">
          En créant un compte, tu acceptes les{' '}
          <a href="/legal/cgu.html" target="_blank" rel="noopener" className="text-zinc-400 underline">CGU</a>{' '}
          et la{' '}
          <a href="/legal/confidentialite.html" target="_blank" rel="noopener" className="text-zinc-400 underline">Politique de confidentialité</a>.
        </p>
        <p className="mt-3 text-center text-sm text-zinc-500">
          Déjà un compte ?{' '}
          <button onClick={() => navigate('/signin')} className="font-bold text-gold">
            Connecte-toi
          </button>
        </p>
      </div>
    </div>
  )
}
