# Garage Temperature Monitor

Live garage temperature, humidity, and multi-sensor monitoring built with Astro, Cloudflare Workers, Supabase, and Stripe.

**Live site:** [garage-temp.robmcd.name](https://garage-temp.robmcd.name)

## What it does

Track probes in a garage (or any space), compare them with outdoor weather, keep history, and get alerted when something goes wrong—freeze risk, humidity spikes, silent feeds, or rapid temperature drops.

You can **pull** HTTPS JSON from a local probe server, or have ESP/Arduino devices **push** readings to a per-device ingest URL. Households can share devices, invite family, and (on Pro) publish read-only share links.

## Features

### Monitoring
- Live readings on Home (temperature, humidity, door, flood, power, CO₂, and generic sensors)
- Pull JSON feeds and push ingest devices in one Devices page
- Feed health checks and relative “last seen” / staleness indicators
- OpenWeather outdoor comparison on the home page
- Historic readings with chart, filters, anomaly hints, and CSV export (Member/Pro)

### Alerts & digests
- Threshold alerts (freeze, humidity, rate-of-change, outage)
- Channels: email, Discord webhook; Pro adds SMS (Twilio), browser push, outbound webhooks
- Test alert with per-channel sent/skipped feedback
- Weekly email digest (Mondays)

### Accounts & collaboration
- Email/password auth, password reset, optional OAuth (Google/GitHub/Discord when enabled in Supabase)
- Households: invite members, rename household, leave, revoke
- Public share links (Pro) with create handoff and expiry badges
- Getting-started checklist with dismiss / auto-hide
- PWA install support

### Ops & content
- Hourly Worker cron for history collection and alert evaluation
- Admin tools: users, contact inbox, jobs
- Prerendered About / docs hub with search, wiring guides, firmware notes, case study
- Contact form (Cloudflare Email + Turnstile)
- GitHub Actions CI (`build` + `vitest`)

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Astro 6, Preact islands, Tailwind CSS v4 |
| Deploy | Cloudflare Workers (`@astrojs/cloudflare`) |
| Auth & DB | Supabase (Auth, Postgres, RLS) |
| Billing | Stripe (Free / Member / Pro) |
| Email | Cloudflare Email binding |
| SMS | Twilio (Pro) |
| Push | Web Push + VAPID (Pro) |

## Plans (entitlements)

| Capability | Free | Member | Pro |
|------------|------|--------|-----|
| Live readings, devices, history browse | ✓ | ✓ | ✓ |
| Email + Discord alerts | ✓ | ✓ | ✓ |
| CSV history export | | ✓ | ✓ |
| Extra push devices | limited | limited | higher limit |
| SMS, browser push, outbound webhook | | | ✓ |
| Public share links | | | ✓ |

Exact device limits live in `src/lib/entitlements.ts`.

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in values
pnpm dev
pnpm test
```

Open [http://localhost:4321](http://localhost:4321).

```bash
pnpm build
pnpm deploy             # Astro build + wrangler deploy
```

Requires Node.js `>=22.12.0`.

## Project layout

```
src/
  components/     UI (dashboard cards, history, alerts, about)
  layouts/        Site + dashboard shells
  lib/            Auth, devices, households, alerts, Stripe, ingest helpers
  pages/          Routes + API endpoints under pages/api/
  styles/         global.css, about.css
  worker.ts       Cloudflare scheduled handler (cron)
supabase/migrations/   Postgres schema & RLS
```

Useful entry points:

- Home live panel: `src/components/LiveTempsPanel.tsx`
- Push ingest: `src/pages/api/ingest/[key].ts`
- Devices API: `src/pages/api/devices/index.ts`
- Cron / alerts: `src/worker.ts`, `src/lib/collectHistory.ts`, `src/lib/alertNotifications.ts`

## Environment variables

Configure in `.env` (local) and Cloudflare Worker secrets / vars (production). See `.env.example` for the full list.

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Browser/auth flows |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB/auth (required with RLS) |
| `GARAGE_TEMP_FEED_URL` | Default public probe JSON feed |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` / `NEXT_PUBLIC_OPENWEATHER_CITY_ID` | Outdoor weather |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_TOKEN` | Contact form bot protection |
| `SMTP_MAIL_FROM` / `SMTP_MAIL_TO` | Contact + alert From/To |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` / `STRIPE_PRICE_ID_PRO` | Billing |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Pro SMS |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Pro browser push |
| `SITE_URL` / `ORIGIN` | OAuth, password reset, Stripe redirects |
| `CRON_SECRET` | Bearer token for manual history cron |
| `OPS_DISCORD_WEBHOOK_URL` | Optional Discord webhook when cron jobs fail (email uses `SMTP_MAIL_TO`) |

Do **not** commit `.env`.

## Database

Apply SQL in `supabase/migrations/` in order against your Supabase project (SQL editor or CLI). Enable RLS only after `SUPABASE_SERVICE_ROLE_KEY` is set in production.

Migrations cover devices/sensors, households/invites, share links, alert metadata, contact status, and related indexes/policies.

## Background jobs

Hourly history collection and alert evaluation run via the Worker `scheduled` handler (`src/worker.ts`, cron `0 * * * *` in `wrangler.jsonc`).

Threshold alerts use live pull-feed readings when available and otherwise fall back to latest stored sensor values (so push-only devices are covered). Push-only households no longer fall back to the public demo feed for cron alerts.

Weekly digest emails send Monday 08:00 UTC to users with digests enabled.

Failed jobs record to the Jobs admin UI and notify ops via `SMTP_MAIL_TO` and optional `OPS_DISCORD_WEBHOOK_URL`.

Manual collection (optional):

```bash
curl -X POST https://your-domain/api/cron/collect-history \
  -H "Authorization: Bearer $CRON_SECRET"
```

Push ingest (`POST /api/ingest/<key>`) accepts at most 64KB payloads and about 60 requests/minute/device (per Worker isolate).
## Connecting hardware

1. Create a push device under **Dashboard → Devices**.
2. Copy the one-time ingest key.
3. Add sensor keys that match your JSON payload (`door1`, `temp1`, …).
4. `POST` JSON to `/api/ingest/<key>`.

Example:

```bash
curl -X POST "https://your-domain/api/ingest/YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"door1": true, "temp1": 42.5}'
```

Guides:

- [Ingest & webhooks](https://garage-temp.robmcd.name/about/ingest-and-webhooks)
- [Accounts & dashboard](https://garage-temp.robmcd.name/about/accounts-and-dashboard)
- Full About hub: [/about](https://garage-temp.robmcd.name/about)

## Documentation (in-app)

The prerendered **About** section is the product docs hub:

| Topic | Path |
|-------|------|
| Hub + search | `/about` |
| Accounts, dashboard, plans | `/about/accounts-and-dashboard` |
| Ingest API & webhooks | `/about/ingest-and-webhooks` |
| Historical data | `/about/historical-data` |
| Probe case study | `/about/temperature-probe-case-study` |
| Arduino wiring / sketches | `/about/arduino-*` |
| PWA install | `/about/install-pwa` |

## Open-source firmware & relays

- [arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever) — probe JSON server
- [garage-temp](https://github.com/doodersrage/garage-temp) — this site
- [fast-api-relay](https://github.com/doodersrage/fast-api-relay) — optional Python relay

## Development tips

- Prefer `pnpm test` before deploy; CI runs build + vitest.
- OAuth providers must be enabled in the Supabase dashboard; otherwise email sign-in should stay form-first (password present) so unused providers are not submitted.
- Stripe webhooks should point at `/api/stripe/webhook` with `STRIPE_WEBHOOK_SECRET`.
- VAPID keys are required for Pro push; generate once and store as secrets.

## License

Released under the [MIT License](LICENSE). Contributions and forks welcome; open an issue if you hit a rough edge in setup or docs.
