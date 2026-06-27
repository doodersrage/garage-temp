interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
  readonly GARAGE_TEMP_FEED_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}