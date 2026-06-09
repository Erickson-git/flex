/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_PAYMENT_MOOV_NUMBER?: string
  readonly VITE_ADMIN_USERNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
