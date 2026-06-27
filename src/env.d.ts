interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
  readonly GARAGE_TEMP_FEED_URL?: string
  readonly STRIPE_SECRET_KEY?: string
  readonly STRIPE_WEBHOOK_SECRET?: string
  readonly STRIPE_PRICE_ID?: string
  readonly SITE_URL?: string
  readonly ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}