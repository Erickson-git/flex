import { DEMO_MODE, supabase } from './supabase'
import type { Report } from './types'
import { ensureCanInteract } from './guard'
import { uid } from './utils'

// ─────────────────────────────────────────────────────────────
// Signalements (modération / conformité Apple & Google).
// Liberté d'expression + filet de sécurité : tout contenu signalable.
// ─────────────────────────────────────────────────────────────

const LS = 'flex.reports'
export const REPORT_REASONS = [
  'Contenu inapproprié',
  'Harcèlement',
  'Spam / arnaque',
  'Nudité',
  'Fausse information',
  'Autre',
]

export async function submitReport(
  reporterId: string,
  targetType: Report['target_type'],
  targetId: string,
  reason: string,
  details?: string,
): Promise<void> {
  ensureCanInteract()
  if (DEMO_MODE) {
    const all = JSON.parse(localStorage.getItem(LS) || '[]') as Report[]
    all.unshift({ id: uid(), target_type: targetType, target_id: targetId, reason, status: 'open', created_at: new Date().toISOString() })
    localStorage.setItem(LS, JSON.stringify(all))
    return
  }
  const { error } = await supabase!.from('reports').insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details ?? null,
  })
  if (error) throw error
}

// ── Admin / modération ──────────────────────────────────────────
export async function fetchOpenReports(): Promise<Report[]> {
  if (DEMO_MODE) {
    const all = JSON.parse(localStorage.getItem(LS) || '[]') as Report[]
    return all.filter((r) => r.status === 'open')
  }
  const { data } = await supabase!
    .from('reports')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return (data ?? []) as Report[]
}

export async function resolveReport(id: string, status: Report['status']): Promise<void> {
  if (DEMO_MODE) {
    const all = JSON.parse(localStorage.getItem(LS) || '[]') as Report[]
    localStorage.setItem(LS, JSON.stringify(all.map((r) => (r.id === id ? { ...r, status } : r))))
    return
  }
  const { error } = await supabase!.rpc('review_report', { p_report: id, p_status: status })
  if (error) throw error
}
