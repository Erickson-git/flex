import { supabase } from './supabase'

// Appelle l'Edge Function « agent-chat » (le cerveau LLM de Mon IA).
// Le token de l'utilisateur est joint automatiquement par supabase-js.
// Tant que la fonction n'est pas déployée + ANTHROPIC_API_KEY non posée,
// l'appel échoue proprement (capté côté UI).
export async function sendAgentMessage(message: string): Promise<string> {
  if (!supabase) throw new Error('Backend indisponible')
  const { data, error } = await supabase.functions.invoke('agent-chat', { body: { message } })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return (data?.reply as string) ?? ''
}
