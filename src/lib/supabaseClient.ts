import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────
// Client Supabase (front). Utilise EXCLUSIVEMENT la clé publique
// (publishable / anon) exposée via les variables VITE_*.
// ⚠️ Ne jamais importer ni préfixer la clé service_role en VITE_ :
//    elle contourne la RLS et finirait dans le bundle navigateur.
// ─────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Aide au débogage en dev : variables manquantes = .env.local non chargé.
  console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes.')
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // gère les retours OAuth / magic link
  },
})

export default supabaseClient
