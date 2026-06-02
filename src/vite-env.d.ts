/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE_URL?: string
  /** Apple Services ID for Sign in with Apple on the web (not the iOS bundle ID). */
  readonly VITE_APPLE_SERVICES_ID?: string
  /** Public site URL for OAuth redirects, e.g. https://web.myfilr.app */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
