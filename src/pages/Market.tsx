import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Crown, Loader2, ShoppingBag, Sparkle, Tag } from 'lucide-react'
import type { MarketListing } from '@/lib/types'
import { fetchListings, listBadge } from '@/lib/economy'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { SparksChip } from '@/components/SparksChip'
import { compact, haptic } from '@/lib/utils'

export default function Market() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const { badges, buy } = useEconomy()
  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sellOpen, setSellOpen] = useState(false)

  const refresh = () => fetchListings().then(setListings)
  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  async function onBuy(l: MarketListing) {
    if (!me || busy) return
    setBusy(l.id)
    haptic([10, 30, 10])
    try {
      const badge = await buy(me.id, l.id)
      flash(`Titre acquis : ${badge || l.payload} 👑`)
      await refresh()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Achat impossible')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col pb-10">
      <header className="safe-top flex items-center justify-between px-4 pb-3 pt-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <div className="font-display text-xl font-extrabold">Le Marché</div>
          <div className="text-[11px] text-zinc-500">Prestige contre Sparks</div>
        </div>
        <SparksChip />
      </header>

      <div className="px-4">
        <button
          onClick={() => {
            haptic(10)
            setSellOpen(true)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-flex-cyan/30 bg-flex-cyan/5 py-3 text-sm font-bold text-flex-cyan active:scale-[0.98]"
        >
          <Tag className="h-4 w-4" />
          Vendre un de mes titres
        </button>
      </div>

      {loading ? (
        <div className="grid flex-1 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {listings.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-gradient-to-r from-ink-700 to-ink-800 p-4"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold to-flex-pink">
                <Crown className="h-6 w-6 text-ink-900" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-white">{l.payload}</div>
                <div className="text-xs text-zinc-500">vendu par {l.seller_name}</div>
              </div>
              <button
                onClick={() => onBuy(l)}
                disabled={!!busy}
                className="flex items-center gap-1 rounded-full bg-gold-grad px-4 py-2 text-sm font-bold text-ink-900 transition active:scale-95 disabled:opacity-50"
              >
                {busy === l.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkle className="h-4 w-4" />
                    {compact(l.price_sparks)}
                  </>
                )}
              </button>
            </motion.div>
          ))}
          {listings.length === 0 && (
            <div className="grid place-items-center py-16 text-center text-sm text-zinc-600">
              <ShoppingBag className="mb-2 h-8 w-8 opacity-40" />
              Marché vide. Sois le premier à mettre un titre en vente.
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="safe-bottom fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-full bg-ink-700 px-5 py-2.5 text-sm font-semibold text-white shadow-card"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendre un badge */}
      <AnimatePresence>
        {sellOpen && (
          <SellSheet
            badges={badges}
            onClose={() => setSellOpen(false)}
            onListed={async (msg) => {
              setSellOpen(false)
              flash(msg)
              await refresh()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SellSheet({
  badges,
  onClose,
  onListed,
}: {
  badges: string[]
  onClose: () => void
  onListed: (msg: string) => void
}) {
  const me = useAuth((s) => s.me)
  const [badge, setBadge] = useState(badges[0] ?? '')
  const [price, setPrice] = useState(500)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!me || !badge || busy) return
    setBusy(true)
    haptic([10, 30, 10])
    try {
      await listBadge(me.id, me.display_name, badge, price)
      onListed(`« ${badge} » en vente pour ${price} ✦`)
    } catch (e) {
      onListed(e instanceof Error ? e.message : 'Échec')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 240 }}
        animate={{ y: 0 }}
        exit={{ y: 240 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-3xl border-t border-white/10 bg-ink-800 p-6 pb-10"
      >
        <h2 className="mb-4 text-xl font-bold">Vendre un titre</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-zinc-400">Tu n’as pas encore de titre échangeable. Gagne-en en grimpant les paliers de prestige.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {badges.map((b) => (
                <button
                  key={b}
                  onClick={() => setBadge(b)}
                  className={
                    'rounded-full border px-3 py-1.5 text-sm font-semibold transition ' +
                    (badge === b ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-zinc-300')
                  }
                >
                  {b}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs text-zinc-500">Prix en Sparks</label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-luxe"
            />
            <button onClick={submit} disabled={busy} className="btn-gold mt-4 w-full disabled:opacity-40">
              {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Mettre en vente'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
