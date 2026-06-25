import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Ban,
  Banknote,
  Check,
  ChevronDown,
  Copy,
  Flag,
  Loader2,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldX,
  Users,
  X,
} from 'lucide-react'
import {
  fetchPendingOrders,
  isAdmin,
  receiptUrl,
  reviewOrder,
  totalUsers,
  type PremiumOrder,
} from '@/lib/premium'
import { fetchPendingPayouts, reviewPayout, type PayoutRequest } from '@/lib/payouts'
import { fetchOpenReports, resolveReport } from '@/lib/reports'
import {
  fetchAdminStats,
  fetchSecurityLogs,
  inspectTarget,
  sanctionUser,
  SANCTION_LABEL,
  type AdminStats,
  type ReportTarget,
  type Sanction,
  type SecurityLog,
} from '@/lib/admin'
import { searchProfiles } from '@/lib/search'
import type { Profile, Report } from '@/lib/types'
import { useAuth } from '@/store/useAuth'
import { useEmojiBurst } from '@/components/EmojiBurst'

const SANCTIONS: Sanction[] = ['warn', 'temp24', 'temp7d', 'perma']

export default function AdminDashboard() {
  const me = useAuth((s) => s.me)
  const loading = useAuth((s) => s.loading)
  const { blast } = useEmojiBurst()
  const [orders, setOrders] = useState<PremiumOrder[]>([])
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [toolsReady, setToolsReady] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [receipts, setReceipts] = useState<Record<string, string | null>>({})

  async function manualRefresh() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  const refresh = async () => {
    const [o, p, r] = await Promise.all([fetchPendingOrders(), fetchPendingPayouts(), fetchOpenReports()])
    setOrders(o)
    setPayouts(p)
    setReports(r)
    const map: Record<string, string | null> = {}
    await Promise.all(o.map(async (ord) => (map[ord.id] = await receiptUrl(ord.receipt_url))))
    setReceipts(map)
    // Outils avancés (admin_tools.sql). S'ils manquent, on dégrade en douceur.
    try {
      const [s, l] = await Promise.all([fetchAdminStats(), fetchSecurityLogs(25)])
      setStats(s)
      setLogs(l)
      setToolsReady(true)
    } catch {
      setToolsReady(false)
      setStats({ users: await totalUsers(), pending: o.length, signups24h: 0, signups7d: 0, openReports: r.length, blocked: 0 })
    }
  }

  useEffect(() => {
    if (isAdmin(me)) {
      refresh()
      const t = setInterval(refresh, 8000)
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

  async function reviewPay(payout: PayoutRequest, approve: boolean) {
    setBusy(payout.id)
    try {
      await reviewPayout(payout, approve)
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
    <div className="mx-auto max-w-lg px-4 pb-20">
      <header className="safe-top flex items-center justify-between py-3">
        <h1 className="font-display text-2xl font-extrabold text-gold-grad">Flesh · Admin</h1>
        <button
          onClick={manualRefresh}
          disabled={refreshing}
          aria-label="Rafraîchir"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-zinc-300 active:scale-90 disabled:opacity-50"
        >
          <RotateCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {!toolsReady && (
        <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
          Outils avancés inactifs. Exécute <span className="font-mono">supabase/admin_tools.sql</span> dans le SQL Editor
          pour activer métriques, sanctions et journal d’activité.
        </div>
      )}

      {/* ── Métriques ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={<Users className="h-4 w-4" />} label="Utilisateurs" value={stats?.users ?? 0} />
        <StatTile label="Inscrits · 24 h" value={stats?.signups24h ?? 0} accent="cyan" />
        <StatTile label="Inscrits · 7 j" value={stats?.signups7d ?? 0} accent="cyan" />
        <StatTile icon={<Flag className="h-4 w-4" />} label="Signalements ouverts" value={stats?.openReports ?? reports.length} accent="pink" />
        <StatTile label="Paiements en attente" value={orders.length} accent="pink" />
        <StatTile icon={<Banknote className="h-4 w-4" />} label="Retraits à payer" value={payouts.length} accent="pink" />
        <StatTile icon={<Ban className="h-4 w-4" />} label="Comptes bloqués" value={stats?.blocked ?? 0} accent="pink" />
      </div>

      {/* ── Paiements ─────────────────────────────────────────── */}
      <SectionTitle>Paiements à valider</SectionTitle>
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
        {orders.length === 0 && <Empty>Aucune demande en attente.</Empty>}
      </div>

      {/* ── Retraits (cashout Sparks → FCFA) ──────────────────── */}
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Retraits à payer</span>
      </SectionTitle>
      <div className="space-y-3">
        <AnimatePresence>
          {payouts.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl border border-white/10 bg-ink-800/60 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{p.user_name ?? p.user_id.slice(0, 6)}</div>
                  <div className="text-sm text-zinc-400">
                    {p.sparks_amount.toLocaleString('fr')} ✦ · {p.provider.toUpperCase()}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-sm font-extrabold text-emerald-300">
                  {p.amount_fcfa.toLocaleString('fr')} FCFA
                </span>
              </div>

              {/* Numéro à payer (copiable) */}
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(p.payout_number)
                }}
                className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-2.5"
              >
                <span className="font-display text-lg font-bold tracking-widest text-gold">{p.payout_number}</span>
                <span className="flex items-center gap-1 text-xs text-zinc-400"><Copy className="h-4 w-4" /> Copier</span>
              </button>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => reviewPay(p, true)}
                  disabled={!!busy}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gold-grad py-2.5 text-sm font-bold text-ink-900 active:scale-95 disabled:opacity-50"
                >
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Marquer payé</>}
                </button>
                <button
                  onClick={() => reviewPay(p, false)}
                  disabled={!!busy}
                  className="flex items-center justify-center gap-1 rounded-xl border border-flex-pink/40 px-4 py-2.5 text-sm font-bold text-flex-pink active:scale-95 disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Rejeter
                </button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">
                Envoie {p.amount_fcfa.toLocaleString('fr')} FCFA via {p.provider.toUpperCase()} au numéro, puis « Marquer payé ».
                Rejeter recrédite les {p.sparks_amount.toLocaleString('fr')} ✦.
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {payouts.length === 0 && <Empty>Aucun retrait en attente.</Empty>}
      </div>

      {/* ── Signalements ──────────────────────────────────────── */}
      <SectionTitle>Signalements ({reports.length})</SectionTitle>
      <div className="space-y-3">
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            busy={busy}
            canSanction={toolsReady}
            onModerate={moderate}
            onSanctioned={refresh}
            setBusy={setBusy}
          />
        ))}
        {reports.length === 0 && <Empty>Aucun signalement. RAS ✓</Empty>}
      </div>

      {/* ── Recherche & modération directe ────────────────────── */}
      {toolsReady && (
        <>
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Recherche & modération</span>
          </SectionTitle>
          <UserModeration />
        </>
      )}

      {/* ── Journal d'activité ────────────────────────────────── */}
      {toolsReady && (
        <>
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Journal d’activité</span>
          </SectionTitle>
          <div className="space-y-1.5">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-800/40 px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className={
                    l.severity === 'critical' ? 'text-flex-pink' : l.severity === 'warn' ? 'text-gold' : 'text-zinc-500'
                  }>●</span>
                  <span className="font-mono text-zinc-300">{l.event}</span>
                </span>
                <span className="text-zinc-600">{new Date(l.created_at).toLocaleString('fr')}</span>
              </div>
            ))}
            {logs.length === 0 && <Empty>Aucun événement récent.</Empty>}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-7 mb-2 text-sm font-bold uppercase tracking-wider text-zinc-400">{children}</h2>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-zinc-600">{children}</div>
}

/** Recherche un compte par pseudo / numéro et applique une sanction directe. */
function UserModeration() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        setResults(await searchProfiles(term))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  async function applySanction(p: Profile, s: Sanction) {
    setBusy(p.id)
    setDoneMsg(null)
    try {
      await sanctionUser(p.id, s, 'admin:direct')
      setDoneMsg(`${SANCTION_LABEL[s]} appliqué à @${p.username}.`)
      setOpenId(null)
    } catch {
      setDoneMsg('Échec de la sanction.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pseudo ou numéro de téléphone…"
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none placeholder:text-zinc-600 focus:border-gold/40"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
      {doneMsg && <p className="mt-2 text-xs text-emerald-300">{doneMsg}</p>}

      <div className="mt-3 space-y-2">
        {searching && <Loader2 className="mx-auto h-4 w-4 animate-spin text-zinc-500" />}
        {results.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-ink-800/60 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/10 text-sm font-bold text-gold">
                {(p.display_name || p.username || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-white">{p.display_name}</div>
                <div className="truncate text-xs text-zinc-500">
                  @{p.username}{p.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              <button
                onClick={() => setOpenId((id) => (id === p.id ? null : p.id))}
                className="flex shrink-0 items-center gap-1 rounded-full border border-flex-pink/40 px-3 py-1.5 text-xs font-bold text-flex-pink active:scale-95"
              >
                <ShieldX className="h-3.5 w-3.5" /> Sanctionner
              </button>
            </div>
            {openId === p.id && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SANCTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => applySanction(p, s)}
                    disabled={!!busy}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold active:scale-95 disabled:opacity-50 ${
                      s === 'perma' ? 'border-flex-pink/50 text-flex-pink' : 'border-white/15 text-zinc-200'
                    }`}
                  >
                    {busy === p.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : SANCTION_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {!searching && q.trim().length >= 2 && results.length === 0 && (
          <Empty>Aucun compte trouvé.</Empty>
        )}
      </div>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  accent?: 'pink' | 'cyan'
}) {
  const color = accent === 'pink' ? 'text-flex-pink' : accent === 'cyan' ? 'text-flex-cyan' : 'text-white'
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">{icon}{label}</div>
      <div className={`mt-1 font-display text-3xl font-extrabold ${color}`}>{value.toLocaleString('fr')}</div>
    </div>
  )
}

function ReportCard({
  report,
  busy,
  canSanction,
  onModerate,
  onSanctioned,
  setBusy,
}: {
  report: Report
  busy: string | null
  canSanction: boolean
  onModerate: (r: Report, s: Report['status']) => void
  onSanctioned: () => Promise<void>
  setBusy: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<ReportTarget | null>(null)
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [sanctionOpen, setSanctionOpen] = useState(false)

  async function inspect() {
    const next = !open
    setOpen(next)
    if (next && !target) {
      setLoadingTarget(true)
      try {
        setTarget(await inspectTarget(report.target_type, report.target_id))
      } catch {
        setTarget({ kind: report.target_type, offenderId: null })
      } finally {
        setLoadingTarget(false)
      }
    }
  }

  async function applySanction(s: Sanction) {
    if (!target?.offenderId) return
    setBusy(report.id)
    try {
      await sanctionUser(target.offenderId, s, `report:${report.reason}`)
      await onSanctioned()
      setSanctionOpen(false)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-white">{report.reason}</div>
          <div className="text-xs text-zinc-500">{report.target_type} · {report.target_id.slice(0, 8)}…</div>
        </div>
        <button onClick={inspect} className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-zinc-300">
          Inspecter <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-white/5 bg-ink-900/60 p-3 text-sm">
              {loadingTarget ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              ) : (
                <>
                  {target?.username && <div className="mb-1 text-xs text-gold">@{target.username}</div>}
                  {target?.content ? (
                    <p className="whitespace-pre-wrap text-zinc-300">{target.content}</p>
                  ) : (
                    <p className="text-zinc-600">Contenu non disponible (message privé ou supprimé).</p>
                  )}
                  {target?.mediaUrl && <img src={target.mediaUrl} alt="" className="mt-2 max-h-56 rounded-lg object-contain" />}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onModerate(report, 'resolved')}
          disabled={!!busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gold-grad py-2 text-sm font-bold text-ink-900 active:scale-95 disabled:opacity-50"
        >
          {busy === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Traiter</>}
        </button>
        <button
          onClick={() => onModerate(report, 'dismissed')}
          disabled={!!busy}
          className="flex items-center justify-center gap-1 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-zinc-400 active:scale-95 disabled:opacity-50"
        >
          <X className="h-4 w-4" /> Ignorer
        </button>
        {canSanction && (
          <button
            onClick={() => setSanctionOpen((v) => !v)}
            disabled={!!busy}
            className="flex items-center justify-center gap-1 rounded-xl border border-flex-pink/40 px-4 py-2 text-sm font-bold text-flex-pink active:scale-95 disabled:opacity-50"
          >
            <ShieldX className="h-4 w-4" /> Sanctionner
          </button>
        )}
      </div>

      <AnimatePresence>
        {sanctionOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2">
            {target?.offenderId ? (
              <div className="grid grid-cols-2 gap-2">
                {SANCTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => applySanction(s)}
                    disabled={!!busy}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold active:scale-95 disabled:opacity-50 ${
                      s === 'perma' ? 'border-flex-pink/50 text-flex-pink' : 'border-white/15 text-zinc-200'
                    }`}
                  >
                    {SANCTION_LABEL[s]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-ink-900/60 px-3 py-2 text-xs text-zinc-500">
                Ouvre « Inspecter » d’abord pour identifier l’auteur à sanctionner.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
