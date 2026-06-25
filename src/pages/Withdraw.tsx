import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Loader2, Sparkles, Wallet2 } from 'lucide-react'
import {
  effectiveSparks,
  fcfaFor,
  MIN_SPARKS,
  requestPayout,
  SPARKS_PER_FCFA,
} from '@/lib/payouts'
import type { Provider } from '@/lib/premium'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { cn, haptic } from '@/lib/utils'

export default function Withdraw() {
  const me = useAuth((s) => s.me)
  const wallet = useEconomy((s) => s.wallet)
  const refresh = useEconomy((s) => s.refresh)
  const navigate = useNavigate()

  const balance = wallet?.sparks ?? 0
  const [amount, setAmount] = useState('')
  const [provider, setProvider] = useState<Provider>('moov')
  const [number, setNumber] = useState(me?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const sparks = Math.max(0, Math.floor(Number(amount) || 0))
  const fcfa = useMemo(() => fcfaFor(sparks), [sparks])
  const held = useMemo(() => effectiveSparks(sparks), [sparks])

  const tooLow = sparks > 0 && sparks < MIN_SPARKS
  const tooHigh = held > balance
  const canSubmit = sparks >= MIN_SPARKS && !tooHigh && number.trim().length >= 6 && !submitting

  async function submit() {
    if (!me || !canSubmit) return
    setSubmitting(true)
    setError(null)
    haptic([10, 30, 10])
    try {
      await requestPayout(me, sparks, provider, number)
      await refresh(me.id)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la demande')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-8 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl">💸</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Retrait demandé ✦</h1>
          <p className="mt-2 max-w-xs text-sm text-zinc-400">
            <b className="text-white">{held.toLocaleString('fr')} ✦</b> ont été mis de côté.
            Tu recevras <b className="text-gold">{fcfa.toLocaleString('fr')} FCFA</b> par{' '}
            {provider.toUpperCase()} sur le {number} après vérification (en général très vite).
          </p>
          <button onClick={() => navigate('/app/me')} className="btn-gold mt-6 w-full">
            Retour
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-16">
      <header className="safe-top flex items-center gap-2 py-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-xl font-extrabold">Retirer mes Sparks</h1>
      </header>

      {/* Solde */}
      <div className="mt-2 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Wallet2 className="h-4 w-4" /> Solde disponible
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold text-gold-grad">{balance.toLocaleString('fr')}</span>
          <Sparkles className="h-5 w-5 text-gold" />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Taux : {SPARKS_PER_FCFA} ✦ = 1 FCFA · retrait minimum {MIN_SPARKS.toLocaleString('fr')} ✦
        </p>
      </div>

      {/* Montant */}
      <div className="mt-5">
        <label className="text-sm font-semibold text-zinc-300">Montant à retirer (en Sparks)</label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-gold/40">
          <Sparkles className="h-5 w-5 shrink-0 text-gold" />
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError(null)
            }}
            placeholder={`${MIN_SPARKS}`}
            className="w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {[MIN_SPARKS, 25000, 50000].map((v) => (
            <button
              key={v}
              onClick={() => {
                haptic(8)
                setAmount(String(Math.min(v, balance)))
                setError(null)
              }}
              disabled={balance < v}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 active:scale-95 disabled:opacity-30"
            >
              {v.toLocaleString('fr')} ✦
            </button>
          ))}
          <button
            onClick={() => {
              haptic(8)
              setAmount(String(balance))
              setError(null)
            }}
            disabled={balance < MIN_SPARKS}
            className="rounded-full border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold active:scale-95 disabled:opacity-30"
          >
            Tout
          </button>
        </div>

        {/* Conversion */}
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-800/60 px-4 py-3">
          <span className="text-sm text-zinc-400">Tu recevras</span>
          <span className="font-display text-xl font-extrabold text-gold">{fcfa.toLocaleString('fr')} FCFA</span>
        </div>
        {tooLow && (
          <p className="mt-2 text-xs text-flex-pink">Minimum {MIN_SPARKS.toLocaleString('fr')} ✦ pour retirer.</p>
        )}
        {tooHigh && <p className="mt-2 text-xs text-flex-pink">Solde insuffisant.</p>}
      </div>

      {/* Opérateur */}
      <div className="mt-5">
        <label className="text-sm font-semibold text-zinc-300">Opérateur mobile money</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['moov', 'flooz'] as const).map((pr) => (
            <button
              key={pr}
              onClick={() => setProvider(pr)}
              className={cn(
                'rounded-2xl border py-3 font-bold uppercase transition',
                provider === pr ? 'border-flex-cyan bg-flex-cyan/15 text-flex-cyan' : 'border-white/10 text-zinc-400',
              )}
            >
              {pr}
            </button>
          ))}
        </div>
      </div>

      {/* Numéro */}
      <div className="mt-5">
        <label className="text-sm font-semibold text-zinc-300">Numéro qui recevra l'argent</label>
        <input
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Ex. 96 96 66 76"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/40"
        />
      </div>

      {error && <p className="mt-4 text-center text-sm text-flex-pink">{error}</p>}

      <button onClick={submit} disabled={!canSubmit} className="btn-gold mt-6 w-full disabled:opacity-40">
        {submitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Demander le retrait'}
      </button>
      <p className="mt-3 text-center text-[11px] text-zinc-600">
        Les Sparks sont retirés de ton solde dès l'envoi (mis de côté) et l'argent t'est versé après vérification.
        En cas de refus, ils te sont intégralement rendus.
      </p>
    </div>
  )
}
