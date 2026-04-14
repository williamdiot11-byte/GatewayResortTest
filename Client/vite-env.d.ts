/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_CAL_BOOKING_LINK: string
  readonly VITE_DEFAULT_BOOKING_AMOUNT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
