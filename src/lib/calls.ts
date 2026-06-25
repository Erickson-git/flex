import { DEMO_MODE, supabase } from './supabase'
import { ensureCanInteract } from './guard'

export interface CallLog {
  id: string
  user_id: string
  peer_id: string | null
  peer_name: string | null
  peer_avatar: string | null
  direction: 'in' | 'out'
  kind: 'audio' | 'video'
  status: 'answered' | 'missed' | 'declined'
  duration_seconds: number
  created_at: string
}

/** L'appelant enregistre l'appel pour les deux parties (RPC sécurisé). */
export async function recordCall(args: {
  caller: string
  callee: string
  callerName: string
  callerAvatar: string | null
  calleeName: string
  calleeAvatar: string | null
  kind: string
  status: string
  duration: number
}): Promise<void> {
  ensureCanInteract()
  if (DEMO_MODE || !supabase) return
  try {
    await supabase.rpc('record_call', {
      p_caller: args.caller,
      p_callee: args.callee,
      p_caller_name: args.callerName,
      p_caller_avatar: args.callerAvatar,
      p_callee_name: args.calleeName,
      p_callee_avatar: args.calleeAvatar,
      p_kind: args.kind,
      p_status: args.status,
      p_duration: Math.round(args.duration || 0),
    })
  } catch {
    /* best-effort */
  }
}

export async function fetchCallLogs(): Promise<CallLog[]> {
  if (DEMO_MODE || !supabase) return []
  const { data } = await supabase
    .from('call_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60)
  return (data ?? []) as CallLog[]
}

export async function clearCallLogs(): Promise<void> {
  if (DEMO_MODE || !supabase) return
  await supabase.from('call_logs').delete().gte('created_at', '1900-01-01')
}
