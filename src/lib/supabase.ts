import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// GARDE-FOU : on refuse catégoriquement une clé secrète côté client.
// (clé service_role = JWT avec "service_role", ou nouveau format "sb_secret_").
if (anon && (anon.startsWith('sb_secret_') || anon.includes('service_role'))) {
  throw new Error(
    '[Sécurité] Une clé service_role/secret a été détectée dans VITE_SUPABASE_ANON_KEY. ' +
      'Utilise EXCLUSIVEMENT la clé publique (anon / publishable) côté client.',
  )
}

/**
 * MODE DÉMO : actif si VITE_DEMO_MODE !== 'false' OU si les clés Supabase
 * sont absentes. Permet de lancer FLEX instantanément, sans backend,
 * avec des données factices (utile pour la démo et le "0 → 1").
 */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE !== 'false' || !url || !anon

export const supabase: SupabaseClient | null =
  !DEMO_MODE && url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null
