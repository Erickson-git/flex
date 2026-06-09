import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, Copy, Loader2, Upload } from 'lucide-react'
import { maskedNumber, paymentNumber, PRODUCTS, submitOrder, type Product, type Provider } from '@/lib/premium'
import { useAuth } from '@/store/useAuth'
import { cn, haptic } from '@/lib/utils'

export default function Premium() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [provider, setProvider] = useState<Provider>('moov')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setReceipt(reader.result as string)
    reader.readAsDataURL(f)
  }

  async function submit() {
    if (!me || !product || !receipt || submitting) return
    setSubmitting(true)
    haptic([10, 30, 10])
    try {
      await submitOrder(me, product, provider, receipt)
      setDone(true)
    } catch {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-8 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
          <h1 className="mt-4 font-display text-2xl font-extrabold">Demande envoyée ✦</h1>
          <p className="mt-2 max-w-xs text-sm text-zinc-400">
            Ton reçu est en cours de vérification. Tes Sparks seront crédités dès validation
            (en général très vite).
          </p>
          <button onClick={() => navigate('/app')} className="btn-gold mt-6 w-full">
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
        <h1 className="font-display text-xl font-extrabold">Recharger / Premium</h1>
      </header>

      {/* Produits */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              haptic(8)
              setProduct(p)
            }}
            className={cn(
              'rounded-2xl border p-4 text-left transition',
              product?.id === p.id ? 'border-gold bg-gold/10' : 'border-white/10 bg-ink-800/60',
            )}
          >
            <div className="text-3xl">{p.emoji}</div>
            <div className="mt-2 font-bold text-white">{p.label}</div>
            <div className="text-sm text-gold">{p.amountFcfa} FCFA</div>
          </button>
        ))}
      </div>

      {product && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          {/* Opérateur */}
          <div className="grid grid-cols-2 gap-2">
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

          {/* Instructions */}
          <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
            <div className="text-sm text-zinc-400">
              1. Envoie <b className="text-white">{product.amountFcfa} FCFA</b> via {provider.toUpperCase()} au numéro :
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span className="font-display text-xl font-bold tracking-widest text-gold">{maskedNumber()}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(paymentNumber())
                  haptic(10)
                }}
                className="flex items-center gap-1 text-xs text-zinc-400"
              >
                <Copy className="h-4 w-4" /> Copier
              </button>
            </div>
            <div className="mt-3 text-sm text-zinc-400">
              2. Téléverse la <b className="text-white">capture du SMS de confirmation</b>.
            </div>
          </div>

          {/* Upload reçu */}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-5 text-sm font-semibold text-zinc-300"
          >
            {receipt ? (
              <img src={receipt} alt="reçu" className="h-24 rounded-lg object-contain" />
            ) : (
              <>
                <Upload className="h-5 w-5" /> Ajouter le reçu
              </>
            )}
          </button>

          <button onClick={submit} disabled={!receipt || submitting} className="btn-gold w-full disabled:opacity-40">
            {submitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Soumettre la demande'}
          </button>
          <p className="text-center text-[11px] text-zinc-600">
            Paiement vérifié manuellement. Les Sparks sont une monnaie interne non remboursable.
          </p>
        </motion.div>
      )}
    </div>
  )
}
