# Garage Temperature Monitor

Live garage temperature and humidity monitoring built with Astro, Cloudflare Workers, Supabase, and Stripe.

## Features

- Live JSON feed readings on the home page with OpenWeather comparison
- Signed-in dashboard for feeds, probe labels, display preferences, and history
- Client-side live refresh for signed-in users (no full-page reload)
- Historic readings table with 7-day chart, feed/probe/date filters, and anomaly hints
- CSV export for subscribers (Stripe) with optional date range
- Threshold email alerts with 4-hour cooldown + weekly digest (Monday 08:00 UTC)
- Hourly background history collection via Worker `scheduled` handler
- Password reset, OAuth sign-in (Google/GitHub/Discord), and PWA manifest
- Admin feed-health dashboard and contact inbox (read/spam/search)
- Rich about/docs hub (prerendered) with search, case study, and interactive probe demo
- Contact form with Cloudflare Email + Turnstile verification
- GitHub Actions CI (`build` + `vitest`)

## Stack

- **Frontend:** Astro 6, Preact islands, Tailwind CSS v4
- **Deploy:** Cloudflare Workers (`@astrojs/cloudflare`)
- **Auth & DB:** Supabase (Auth, Postgres, RLS)
- **Billing:** Stripe subscriptions
- **Email:** Cloudflare Email binding

## Development

```bash
pnpm install
pnpm dev
pnpm test
```

Open `http://localhost:4321`.

Copy `.env.example` to `.env` and fill in values.

## Environment variables

Configure in `.env` (local) and Cloudflare secrets (production):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key (auth flows) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB/auth admin (required when RLS enabled) |
| `GARAGE_TEMP_FEED_URL` | Default public probe JSON feed |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | OpenWeather API key |
| `NEXT_PUBLIC_OPENWEATHER_CITY_ID` | Default city ID |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_TOKEN` | Cloudflare Turnstile |
| `SMTP_MAIL_FROM` / `SMTP_MAIL_TO` | Contact + alert email |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Stripe billing |
| `SITE_URL` / `ORIGIN` | OAuth + password reset redirects |
| `CRON_SECRET` | Bearer token for manual `/api/cron/collect-history` |

## Background jobs

Hourly history collection and alert evaluation run via the Worker `scheduled` handler (`src/worker.ts`, cron `0 * * * *` in `wrangler.jsonc`).

Weekly digest emails send Monday 08:00 UTC to users with alerts enabled.

Optional manual collection:

```bash
curl -X POST https://your-domain/api/cron/collect-history \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Database migrations

Apply Supabase migrations in `supabase/migrations/`, including contact status columns and RLS enablement. Set `SUPABASE_SERVICE_ROLE_KEY` in production before enabling RLS.

## Deploy

```bash
pnpm build
pnpm deploy
```

## Open-source firmware & relays

- [arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever)
- [garage-temp](https://github.com/doodersrage/garage-temp) (this site)
- [fast-api-relay](https://github.com/doodersrage/fast-api-relay)
