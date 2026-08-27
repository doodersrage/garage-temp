# Garage Temperature Monitor

Live garage temperature, humidity, and multi-sensor monitoring built with Astro, Cloudflare Workers, Supabase, and Stripe.

**Live site:** [garage-temp.robmcd.name](https://garage-temp.robmcd.name)

## What it does

Track probes in a garage (or any space), compare them with outdoor weather, keep history, and get alerted when something goes wrong—freeze risk, humidity spikes, silent feeds, or rapid temperature drops.

You can **pull** HTTPS JSON from a local probe server, or have ESP/Arduino devices **push** readings to a per-device ingest URL. Households can share devices, invite family, and (on Pro) publish read-only share links.

## Features

### Monitoring
- Live readings on Home (temperature, humidity, door, flood, power, CO₂, and generic sensors)
- Pull JSON feeds and push ingest devices in one Devices page (device health, battery/RSSI)
- Feed health checks and relative “last seen” / staleness indicators
- OpenWeather outdoor comparison on the home page
- Historic readings with chart, YoY overlay, filters, anomaly hints, and CSV export (Member/Pro)
- Opt-in public city freeze-risk map (`/freeze-map`) with geographic map, presets, geocode search, sparklines; embed at `/embed/freeze-map`
- Public `/system-status` job health page and `/docs/api` + `public/openapi.yaml`
- Customer story landing page at `/stories/garage-freeze-alert`
- Device space labels (garage / attic / …), home filter, and space comparison on history
- “Nights at risk” outlook on the dashboard with weather map and NWS freeze alerts (US)
- Embeddable live widget (`/embed/<token>`) for share links

### Alerts & digests
- Threshold alerts (freeze, humidity, rate-of-change, outage); also evaluated on push ingest
- Battery/RSSI device health alerts
- Alert snooze (24h) and vacation mode (7d); one-click snooze links in Telegram/Slack messages
- Forecast freeze risk (OpenWeather 3h forecast look-ahead)
- Composite AND rules (door + temp drop, flood, power, outage, …) with optional value/label filters
- Quiet hours with optional freeze/forecast bypass and Pro SMS-critical override
- Per-kind severity routing (which channels fire for threshold vs rate vs outage, …)
- Channels: email, Discord, Telegram, Slack; Pro adds SMS (Twilio), browser push, outbound webhooks
- Test alert with per-channel sent/skipped feedback and alert activity audit trail
- Weekly email digest (Mondays) and optional monthly freeze report (1st of month, HTML attachment)
- Quarterly seasonal report (Jan/Apr/Jul/Oct) and onboarding drip emails (days 1, 3, 7)
- Trial-ending reminders at 3 and 1 days for Stripe trialing subscriptions
- Per-space channel routing UI; webhook delivery log for Pro outbound/reading webhooks

### Accounts & collaboration
- Email/password auth, password reset, optional OAuth (Google/GitHub/Discord when enabled in Supabase)
- **Plans & pricing** — public `/pricing` with monthly/annual toggle (defaults to annual), env-driven display prices, `/compare` vs alternatives, upgrade nudges with checkout source analytics
- Contextual **upgrade nudges** on dashboard, alerts, history, devices, and share when a feature needs Member or Pro
- Households: invite members (including read-only **viewer** role), rename, leave, revoke
- Multi-household switcher when you belong to more than one property
- Public share links (Pro): live, history (7d), metrics, or embed scopes
- Inbound webhooks (Pro): snooze/vacation from HA, Zapier, or Make
- Dashboard API keys (Pro) for `GET /api/v1/metrics`; downloadable Grafana dashboard JSON
- JSON data export (`GET /api/user/export`)
- Pro checkout includes 14-day trial and Stripe promotion codes at checkout

### Expansion pack 4 (dashboard polish)
- **Viewer enforcement** on device, alert, feed, and share mutations
- **Door duration** card, multi-probe history chart, freeze-hours score, indoor/outdoor delta chart
- **Alert escalation** (SMS repeat), custom templates, Telegram bot commands (`/status`, `/snooze`, `/vacation`)
- **Second property** households, device transfer between properties, activity audit log
- **Public status pages** (`/status/<token>`), iCal freeze outlook feed, ingest stats panel
- **Live SSE** stream (`/api/home/readings/stream`), 30s home polling, PWA offline stale cache (v3)
- Freeze-map heatmap rings sized by sample count; HA entity naming YAML in `public/ha/`

### Final expansion (referrals, polish, operator tools)
- **Referral program** — invite link on dashboard; referred signups get +7 days Pro trial (email or OAuth)
- **Alert template editor** — per-kind title/body overrides with `{{kind}}`, `{{title}}`, `{{body}}`
- **Battery trend alerts** — separate toggle from low-battery threshold; own cooldown
- **Door open history** — persisted closed sessions on dashboard
- **Inbound webhook actions** — `clear_snooze`, `clear_vacation`, `status` in addition to snooze/vacation
- **Viewer read-only alerts** — form disabled for viewer role; test alert hidden
- **SSE-triggered live refresh** — home panel reloads on stream events (polling fallback)
- **Grafana setup** card on Share page with dashboard JSON download
- **Activity + ingest stats** — always visible with empty states on Share page

### Kitchen sink (depth, rewards, operator polish)
- **Time-to-freeze estimate** — trend card on dashboard from recent readings
- **Week vs last year** — 7-day average comparison card on dashboard
- **Referrer rewards** — +7 Pro trial days for referrers when a friend subscribes
- **Alert acknowledgment** — “I'm on it” on recent alert activity
- **Reading webhooks** — POST on every successful ingest (optional HMAC secret)
- **Per-space channel routing** — JSON rules to route garage/attic alerts to specific channels
- **Signed inbound webhooks** — optional `X-GarageTemp-Signature` HMAC verification
- **Battery sparklines** — 14-sample history on Devices health table
- **Light theme + °C preference** — display preferences (dark / light / system)
- **Home Assistant setup card** — YAML downloads + inbound status recipe on dashboard
- **Freeze-map city search** — public geocode lookup on `/freeze-map`
- **Admin referral stats + ingest abuse watch** — Users and Jobs admin pages

### Ops & content
- Hourly Worker cron for history collection and alert evaluation
- Admin tools: users, contact inbox, jobs, **ops dashboard** (`/dashboard/ops`) — checkout funnel, Stripe price audit, referral stats, email smoke tests, recent page errors
- Middleware error logging to `server_errors` with ops email/Discord notify (5 min cooldown per path)
- Public `/system-status` and friendly `/500` error page
- Prerendered About / docs hub with search, wiring guides, firmware notes, case study
- Contact form (Cloudflare Email + Turnstile)
- GitHub Actions CI (`typecheck` + `build` + `vitest` + Playwright E2E)
- Astro import guard tests on all pages (catches missing component imports before deploy)

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Astro 6, Preact islands, Tailwind CSS v4 |
| Deploy | Cloudflare Workers (`@astrojs/cloudflare`) |
| Auth & DB | Supabase (Auth, Postgres, RLS) |
| Billing | Stripe (Free / Member / Pro; monthly + annual prices) |
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
| Metrics share (Prometheus/Grafana) | | | ✓ |
| Dashboard API keys (`/api/v1/metrics`) | | | ✓ |
| History share links | | | ✓ |

Exact device limits live in `src/lib/entitlements.ts`.

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in values
pnpm dev
pnpm test
pnpm typecheck
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
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` / `STRIPE_PRICE_ID_PRO` | Billing (monthly) |
| `STRIPE_PRICE_ID_ANNUAL` / `STRIPE_PRICE_ID_PRO_ANNUAL` | Billing (annual Member/Pro; create prices in Stripe Dashboard) |
| `STRIPE_DISPLAY_MEMBER_MONTHLY` / `STRIPE_DISPLAY_MEMBER_ANNUAL` | Display-only USD prices on `/pricing` (not charged — Stripe prices are authoritative) |
| `STRIPE_DISPLAY_PRO_MONTHLY` / `STRIPE_DISPLAY_PRO_ANNUAL` | Display-only Pro prices on `/pricing` |
| `PRICING_DEFAULT_INTERVAL` | Default billing toggle on `/pricing` (`annual` or `monthly`) |
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

Hourly history collection and alert evaluation run via the Worker `scheduled` handler (`src/worker.ts`, cron `0 * * * *` in `wrangler.jsonc`). The same cron also snapshots opt-in freeze-map city aggregates, sends trial reminders and onboarding drip emails, and runs monthly/quarterly reports on schedule.

Threshold alerts use live pull-feed readings when available and otherwise fall back to latest stored sensor values (so push-only devices are covered). Push ingest also evaluates threshold/rule alerts immediately (with the same cooldowns as cron). Push-only households no longer fall back to the public demo feed for cron alerts.

Weekly digest emails send Monday 08:00 UTC to users with digests enabled.

### Outbound email (Cloudflare Email)

`wrangler.jsonc` uses an unrestricted `MAILER` send_email binding so drip, trial, alert, and digest mail can reach user addresses. That requires **Email Sending** enabled for the `SMTP_MAIL_FROM` domain (e.g. `robmcd.name`) in the Cloudflare dashboard (Email → Email Sending), or:

```bash
wrangler login   # refresh token if enable fails with auth error
wrangler email sending enable robmcd.name
```

If the binding is locked with `destination_address`, drips to other inboxes fail with `email to … not allowed`. The drip cron treats that as restricted (job stays success) until Email Sending is enabled.

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
  -d '{"door1": true, "temp1": 42.5, "battery": 87, "rssi": -62}'
```

Optional top-level `battery` / `battery_pct` and `rssi` update device health metadata.

Guides:

- [Ingest & webhooks](https://garage-temp.robmcd.name/about/ingest-and-webhooks)
- [Home Assistant blueprint](https://garage-temp.robmcd.name/ha/garage_temp_webhook.yaml)
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

## Deploy

```bash
pnpm test && pnpm build && pnpm deploy
```

After deploy, set Cloudflare Worker secrets (Dashboard → Workers → garage-temp → Settings → Variables) including `STRIPE_DISPLAY_*` for pricing copy and confirm hourly cron is enabled (`0 * * * *` in `wrangler.jsonc`).

Keep display amounts aligned with live Stripe:

```bash
node --env-file=.env scripts/audit-stripe-prices.mjs
```

Or open `/dashboard/ops` (admin) and check the Stripe display price audit table.

**Post-deploy smoke checklist**

- `/system-status` — healthy + recent cron runs
- `/pricing` — display prices match Stripe (monthly/annual toggle)
- `/compare`, `/docs/api`, `/stories/garage-freeze-alert` — CTAs to `/pricing`
- Dashboard → **Ops** (admin) — health, price audit Match, checkout funnel, email smoke test
- Optional: set `OPS_DISCORD_WEBHOOK_URL` so cron/page failures notify Discord (email uses `SMTP_MAIL_TO`)
- Trigger a test alert → Share page webhook delivery log

CI runs typecheck, unit tests, build, and Playwright smoke tests on every push to `main`.

## Development tips

- Prefer `pnpm test` and `pnpm test:e2e` before deploy; CI runs build, vitest, and Playwright.
- OAuth providers must be enabled in the Supabase dashboard; otherwise email sign-in should stay form-first (password present) so unused providers are not submitted.
- Stripe webhooks should point at `/api/stripe/webhook` with `STRIPE_WEBHOOK_SECRET`.
- VAPID keys are required for Pro push; generate once and store as secrets.

## License

Released under the [MIT License](LICENSE). Contributions and forks welcome; open an issue if you hit a rough edge in setup or docs.
