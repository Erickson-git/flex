// ─────────────────────────────────────────────────────────────
// FLEX — Edge Function « agent-chat » : le cerveau de « Mon IA ».
// Utilise GROQ (API OpenAI-compatible, rapide & économique).
// La clé GROQ_API_KEY vit ICI (secret serveur), JAMAIS dans le front.
//
// Déploiement :
//   supabase functions deploy agent-chat
//   supabase secrets set GROQ_API_KEY=gsk_...   (UNE CLÉ RÉGÉNÉRÉE)
// (SUPABASE_URL / SUPABASE_ANON_KEY sont injectées automatiquement.)
//
// Modèle Groq par défaut : llama-3.3-70b-versatile (puissant).
// Pour plus de vitesse/moins de coût : llama-3.1-8b-instant.
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return json({ error: 'GROQ_API_KEY non configurée sur Supabase.' }, 500)

    // Client lié au JWT de l'utilisateur → la RLS limite l'accès à SON agent.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Non authentifié' }, 401)

    const { message } = await req.json()
    if (!message || typeof message !== 'string') return json({ error: 'message requis' }, 400)

    // Agent + mémoire récente (RLS owner-only)
    const { data: agent } = await supabase
      .from('agents').select('name, level').eq('user_id', user.id).maybeSingle()
    const { data: memories } = await supabase
      .from('agent_memories').select('content')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)

    const system = [
      `Tu es « ${agent?.name ?? 'Mon IA'} », l'agent IA personnel et complice de l'utilisateur sur FLEX,`,
      `un réseau social lifestyle/showbiz (cible 18–40 ans, ton branché, émojis bienvenus).`,
      `Tu es son wingman créatif : aide-le à écrire des posts percutants, trouver des idées de`,
      `contenu et de story, briser la glace. Réponds court, vivant, motivant. Français par défaut.`,
      `Niveau de complicité : ${agent?.level ?? 1}.`,
      memories?.length
        ? `Ce que tu sais de lui :\n- ${memories.map((m: { content: string }) => m.content).join('\n- ')}`
        : '',
    ].filter(Boolean).join(' ')

    // Appel Groq (OpenAI-compatible)
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message },
        ],
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return json({ error: `Groq ${res.status}: ${detail.slice(0, 200)}` }, 502)
    }
    const data = await res.json()
    const reply: string = data?.choices?.[0]?.message?.content ?? ''

    // Mémorise l'échange (best-effort ; embedding rempli plus tard)
    await supabase.from('agent_memories')
      .insert({ user_id: user.id, kind: 'interaction', content: `Demande: ${message.slice(0, 280)}` })

    return json({ reply })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500)
  }
})
