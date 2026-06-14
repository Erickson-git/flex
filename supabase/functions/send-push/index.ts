// Edge Function : envoie une notification Web Push à tous les abonnements
// d'un utilisateur. Appelée par le client (supabase.functions.invoke) lors
// d'un appel entrant ou d'un nouveau message direct.
//
// Secrets requis : VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:flex@example.com',
  Deno.env.get('VAPID_PUBLIC')!,
  Deno.env.get('VAPID_PRIVATE')!,
)

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const input = await req.json()
    const { to_user, ...rest } = input
    if (!to_user) return json({ error: 'to_user requis' }, 400)

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', to_user)

    // Toutes les options (tag, cancel, requireInteraction…) sont transmises au SW.
    const payload = JSON.stringify({ title: 'FLEX', body: '', url: '/app', ...rest })

    let sent = 0
    await Promise.all(
      (subs ?? []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          )
          sent++
        } catch (e) {
          const code = (e as { statusCode?: number; status?: number })?.statusCode ??
            (e as { status?: number })?.status
          if (code === 404 || code === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          }
        }
      }),
    )

    return json({ sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
