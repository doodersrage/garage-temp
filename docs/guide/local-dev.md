# Local development

```bash
git clone https://github.com/doodersrage/thermaltrace.git
cd thermaltrace
pnpm install
cp .env.example .env   # fill Supabase, SITE_URL, etc.
pnpm dev               # http://localhost:4321
```

You typically need `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SITE_URL` / `ORIGIN` (e.g. `http://localhost:4321`). Turnstile keys are required for register/sign-in.

Useful scripts:

```bash
pnpm test
pnpm typecheck         # full-repo tsc --noEmit
pnpm build
pnpm test:e2e          # Playwright (needs build / local server per config)
pnpm audit:stripe      # compare STRIPE_DISPLAY_* to live Stripe prices
pnpm docs:dev          # this docs site locally (base /thermaltrace/)
pnpm docs:build
```

Authenticated alert-settings E2E: set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in `.env`, then:

```bash
pnpm e2e:reset-password   # optional: recreate/reset the E2E user via Supabase admin
pnpm test:e2e:auth
# against production: PLAYWRIGHT_BASE_URL=https://thermaltrace.dev pnpm test:e2e:auth
```

Auth E2E signs in through the Supabase API (sets session cookies) so it does not depend on Turnstile.

## Environment variables

Configure in `.env` (local) and Cloudflare Worker secrets / vars (production). Full list: [`.env.example`](https://github.com/doodersrage/thermaltrace/blob/main/.env.example). Do **not** commit `.env`.

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Browser / auth flows |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB / auth (required with RLS) |
| `GARAGE_TEMP_FEED_URL` | Default public probe JSON feed (guest Home demo) |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` / `NEXT_PUBLIC_OPENWEATHER_CITY_ID` | Outdoor weather |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_TOKEN` | Bot protection on contact and auth forms |
| `SMTP_MAIL_FROM` / `SMTP_MAIL_TO` | From address + ops/contact To |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing + webhooks |
| `STRIPE_PRICE_ID` / `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_PORTFOLIO` | Monthly Member / Pro / Portfolio price IDs |
| `STRIPE_PRICE_ID_ANNUAL` / `STRIPE_PRICE_ID_PRO_ANNUAL` / `STRIPE_PRICE_ID_PORTFOLIO_ANNUAL` | Annual Member / Pro / Portfolio price IDs |
| `STRIPE_DISPLAY_MEMBER_*` / `STRIPE_DISPLAY_PRO_*` / `STRIPE_DISPLAY_PORTFOLIO_*` | Display-only USD amounts on `/pricing` (must match Stripe) |
| `PRICING_DEFAULT_INTERVAL` | `annual` or `monthly` default on `/pricing` |
| `TWILIO_*` | Pro SMS |
| `VAPID_*` | Pro browser Web Push — `pnpm generate:vapid` |
| `FCM_*` | Pro Android FCM (HTTP v1 service account) |
| `SITE_URL` / `ORIGIN` | OAuth, password reset, Stripe redirects |
| `CRON_SECRET` | Bearer for manual history cron (`/api/cron/collect-history`) |
| `OPS_DISCORD_WEBHOOK_URL` | Optional Discord when jobs / pages fail |

## Database

Apply SQL in [`supabase/migrations/`](https://github.com/doodersrage/thermaltrace/tree/main/supabase/migrations) **in order** (SQL editor or `pnpm db:push`). Enable RLS only after `SUPABASE_SERVICE_ROLE_KEY` is set in production.

Regenerate types after schema changes:

```bash
pnpm generate-types
```

## Deploy (production)

See [Deploy & ops](/guide/deploy). Short path:

```bash
pnpm ops:check
pnpm test && pnpm typecheck && pnpm build
pnpm db:push
pnpm secrets:push
pnpm deploy
```

Worker name on Cloudflare may still be `garage-temp`; the product brand is ThermalTrace. Set `SITE_URL` / `ORIGIN` to `https://thermaltrace.dev`.

## Docs site only

```bash
pnpm --dir docs --ignore-workspace install
pnpm docs:dev
```

Pages deploy runs from `.github/workflows/docs.yml` on pushes that touch `docs/`, `sketches/`, or `public/openapi.yaml`.
