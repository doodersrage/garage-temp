interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly GARAGE_TEMP_FEED_URL?: string;
  readonly NEXT_PUBLIC_OPENWEATHER_API_KEY?: string;
  readonly NEXT_PUBLIC_OPENWEATHER_CITY_ID?: string;
  readonly TURNSTILE_SITE_KEY?: string;
  readonly TURNSTILE_SECRET_TOKEN?: string;
  readonly SMTP_MAIL_FROM?: string;
  readonly SMTP_MAIL_TO?: string;
  readonly STRIPE_SECRET_KEY?: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;
  readonly STRIPE_PRICE_ID?: string;
  readonly STRIPE_PRICE_ID_PRO?: string;
  readonly STRIPE_PRICE_ID_ANNUAL?: string;
  readonly STRIPE_PRICE_ID_PRO_ANNUAL?: string;
  readonly STRIPE_DISPLAY_MEMBER_MONTHLY?: string;
  readonly STRIPE_DISPLAY_MEMBER_ANNUAL?: string;
  readonly STRIPE_DISPLAY_PRO_MONTHLY?: string;
  readonly STRIPE_DISPLAY_PRO_ANNUAL?: string;
  readonly SITE_URL?: string;
  readonly ORIGIN?: string;
  readonly CRON_SECRET?: string;
  readonly TWILIO_ACCOUNT_SID?: string;
  readonly TWILIO_AUTH_TOKEN?: string;
  readonly TWILIO_FROM_NUMBER?: string;
  readonly VAPID_PUBLIC_KEY?: string;
  readonly VAPID_PRIVATE_KEY?: string;
  readonly VAPID_SUBJECT?: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
