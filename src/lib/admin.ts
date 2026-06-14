import { DEMO_MODE, supabase } from './supabase'
import type { Report } from './types'

// ─────────────────────────────────────────────────────────────
// Couche données du back-office admin. S'appuie sur les RPC
// admin-gated de supabase/admin_tools.sql. Si ce fichier SQL n'a
// pas encore été exécuté, les appels échouent proprement (try/catch
// côté UI) au lieu de casser la page.
// ─────────────────────────────────────────────────────────────

export interface AdminStats {
  users: number
  pending: number
  signups24h: number
  signups7d: number
  openReports: number
  blocked: number
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = { users: 0, pending: 0, signups24h: 0, signups7d: 0, openReports: 0, blocked: 0 }
  if (DEMO_MODE) return empty
  const { data, error } = await supabase!.rpc('admin_stats')
  if (error) throw error
  return { ...empty, ...(data as Partial<AdminStats>) }
}

export interface SecurityLog {
  id: number
  actor: string | null
  event: string
  severity: 'info' | 'warn' | 'critical'
  created_at: string
  meta: Record<string, unknown>
}

export async function fetchSecurityLogs(limit = 25): Promise<SecurityLog[]> {
  if (DEMO_MODE) return []
  const { data, error } = await supabase!.rpc('admin_recent_logs', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as SecurityLog[]
}

export type Sanction = 'warn' | 'temp24' | 'temp7d' | 'perma'

export const SANCTION_LABEL: Record<Sanction, string> = {
  warn: 'Avertir',
  temp24: 'Ban 24 h',
  temp7d: 'Ban 7 jours',
  perma: 'Ban définitif',
}

/** Applique une sanction sur un utilisateur (RPC admin-gated). */
export async function sanctionUser(userId: string, sanction: Sanction, reason: string): Promise<void> {
  if (DEMO_MODE) return
  if (sanction === 'warn') {
    const { error } = await supabase!.rpc('admin_warn_user', { p_uid: userId, p_reason: reason })
    if (error) throw error
    return
  }
  const hours = sanction === 'temp24' ? 24 : sanction === 'temp7d' ? 24 * 7 : 0
  const until = hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null
  const { error } = await supabase!.rpc('admin_ban_user', { p_uid: userId, p_reason: reason, p_until: until })
  if (error) throw error
}

export async function unbanUser(userId: string): Promise<void> {
  if (DEMO_MODE) return
  const { error } = await supabase!.rpc('admin_unban_user', { p_uid: userId })
  if (error) throw error
}

export interface ReportTarget {
  kind: Report['target_type']
  offenderId: string | null
  username?: string
  content?: string
  mediaUrl?: string | null
}

/** Charge le contenu/profil visé par un signalement pour inspection. */
export async function inspectTarget(
  targetType: Report['target_type'],
  targetId: string,
): Promise<ReportTarget> {
  if (DEMO_MODE) return { kind: targetType, offenderId: targetType === 'profile' ? targetId : null }

  if (targetType === 'profile') {
    const { data } = await supabase!.from('profiles').select('id, username, bio').eq('id', targetId).maybeSingle()
    return { kind: 'profile', offenderId: targetId, username: data?.username, content: data?.bio ?? undefined }
  }
  if (targetType === 'post') {
    const { data } = await supabase!
      .from('flexes')
      .select('content, media_url, author_id, author:profiles!author_id(username)')
      .eq('id', targetId)
      .maybeSingle()
    const author = (data as { author?: { username?: string } } | null)?.author
    return {
      kind: 'post',
      offenderId: (data as { author_id?: string } | null)?.author_id ?? null,
      username: author?.username,
      content: (data as { content?: string } | null)?.content,
      mediaUrl: (data as { media_url?: string | null } | null)?.media_url ?? null,
    }
  }
  // message : on ne déréférence pas le contenu privé ; l'offender reste inconnu.
  return { kind: 'message', offenderId: null }
}
