import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, ShieldAlert, Users, X } from 'lucide-react'
import {
  fetchPendingOrders,
  isAdmin,
  receiptUrl,
  reviewOrder,
  totalUsers,
  type PremiumOrder,
} from '@/lib/premium'
import { fetchOpenReports, resolveReport } from '@/lib/reports'
import type { Report } from '@/lib/types'
import { useAuth } from '@/store/useAuth'
import { useEmojiBurst } from '@/components/EmojiBurst'

export default function AdminDashboard() {
  const me = useAuth((s) => s.me)
  const loading = useAuth((s) => s.loading)
  const { blast } = useEmojiBurst()
  const [orders, setOrders] = useState<PremiumOrder[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<Record<string, string | null>>({})

  const refresh = async () => {
    const [o, u, r] = await Promise.all([fetchPendingOrders(), totalUsers(), fetchOpenReports()])
    setOrders(o)
    setUsers(u)
    setReports(r)
    // résout les URLs de reçus (signées en prod)
    const map: Record<string, string | null> = {}
    await Promise.all(o.map(async (ord) => (map[ord.id] = await receiptUrl(ord.receipt_url))))
    setReceipts(map)
  }

  useEffect(() => {
    if (isAdmin(me)) {
      refresh()
      const t = setInterval(refresh, 8000) // "temps réel" léger
      return () => clearInterval(t)
    }
  }, [me])

  if (loading) return <div className="grid min-h-[100dvh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>
  if (!me) return <Navigate to="/" replace />
  if (!isAdmin(me)) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-8 text-center text-zinc-500">
        <div>
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-flex-pink" />
          Accès réservé. Cette zone n’existe pas pour toi.
        </div>
      </div>
    )
  }

  async function review(order: PremiumOrder, approve: boolean) {
    setBusy(order.id)
    try {
      await reviewOrder(order, approve)
      if (approve) blast('💸')
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  async function moderate(report: Report, status: Report['status']) {
    setBusy(report.id)
    try {
      await resolveReport(report.id, status)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-16">
      <header className="safe-top py-3">
        <h1 className="font-display text-2xl font-extrabold text-gold-grad">Flesh · Admin</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Users className="h-4 w-4" /> Utilisateurs
          </div>
          <div className="mt-1 font-display text-3xl font-extrabold text-white">{users.toLocaleString('fr')}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <div className="text-xs text-zinc-500">Demandes en attente</div>
          <div className="mt-1 font-display text-3xl font-extrabold text-flex-pink">{orders.length}</div>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wider text-zinc-400">Paiements à valider</h2>
      <div className="space-y-4">
        <AnimatePresence>
          {orders.map((o) => (
            <motion.div
              key={o.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60"
            >
              {receipts[o.id] ? (
                <img src={receipts[o.id] as string} alt="reçu" className="max-h-72 w-full bg-black object-contain" />
              ) : (
                <div className="grid h-40 place-items-center text-xs text-zinc-600">Reçu indisponible</div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{o.user_name ?? o.user_id.slice(0, 6)}</div>
                    <div className="text-sm text-zinc-400">
                      {o.product} · {o.amount_fcfa} FCFA · {o.provider.toUpperCase()}
                    </div>
                  </div>
                  <span className="rounded-full bg-gold/10 px-2 py-1 text-xs font-bold text-gold">
                    +{o.sparks_reward} ✦{o.grants_vip ? ' · VIP' : ''}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => review(o, true)}
                    disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gold-grad py-2.5 text-sm font-bold text-ink-900 active:scale-95 disabled:opacity-50"
                  >
                    {busy === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Valider</>}
                  </button>
                  <button
                    onClick={() => review(o, false)}
                    disabled={!!busy}
                    className="flex items-center justify-center gap-1 rounded-xl border border-flex-pink/40 px-4 py-2.5 text-sm font-bold text-flex-pink active:scale-95 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Rejeter
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {orders.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-600">Aucune demande en attente.</div>
        )}
      </div>

      {/* Modération : signalements */}
      <h2 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
        Signalements ({reports.length})
      </h2>
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{r.reason}</div>
                <div className="text-xs text-zinc-500">
                  {r.target_type} · {r.target_id.slice(0, 8)}…
                </div>
              </div>
              <span className="rounded-full bg-flex-pink/10 px-2 py-1 text-[10px] font-bold uppercase text-flex-pink">
                {r.status}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => moderate(r, 'resolved')}
                disabled={!!busy}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gold-grad py-2 text-sm font-bold text-ink-900 active:scale-95 disabled:opacity-50"
              >
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Traiter</>}
              </button>
              <button
                onClick={() => moderate(r, 'dismissed')}
                disabled={!!busy}
                className="flex items-center justify-center gap-1 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-zinc-400 active:scale-95 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Ignorer
              </button>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-600">Aucun signalement. RAS ✓</div>
        )}
      </div>
    </div>
  )
}
