# ThermalTrace

Open-source dashboard to **track, log, and analyze temperature probe curves** — built with **Astro 6**, **Cloudflare Workers**, **Supabase**, and **Stripe**.

**Production:** [thermaltrace.dev](https://thermaltrace.dev)  
**Workers preview:** [garage-temp.doodersrage.workers.dev](https://garage-temp.doodersrage.workers.dev) (redirects to apex)  
**API docs:** [/docs/api](https://thermaltrace.dev/docs/api) · [OpenAPI](https://thermaltrace.dev/openapi.yaml)

---

## Contents

- [What it does](#what-it-does)
- [Features](#features)
- [Plans](#plans-entitlements)
- [Stack](#stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Project layout](#project-layout)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Background jobs](#background-jobs)
- [Outbound email](#outbound-email-cloudflare-email)
- [Connecting hardware](#connecting-hardware)
- [Documentation (in-app)](#documentation-in-app)
- [Deploy & ops](#deploy--ops)
- [Development tips](#development-tips)
- [License](#license)

---

## What it does

ThermalTrace connects temperature (and humidity) probes in a garage, attic, shed, basement, or other space, compares them with outdoor weather, keeps history you can chart and export, and alerts you when something goes wrong — freeze risk, humidity spikes, silent feeds, door left open, or rapid temperature drops.

You can **pull** HTTPS JSON from a local probe server, or have ESP/Arduino devices **push** readings to a per-device ingest URL. Households share devices, invite family (including read-only viewers), and (on Pro) publish share links, metrics, and inbound automation webhooks.

---

## Features

### Monitoring & history

- Live readings on Home (temperature, humidity, door, flood, power, CO₂, and generic sensors)
- Pull JSON feeds and push ingest devices on one Devices page (battery / RSSI health, sparklines)
- Feed health, relative “last seen,” and staleness indicators
- OpenWeather outdoor comparison; optional °C and light / dark / system theme
- History with chart, YoY overlay, filters, anomaly hints, space comparison, CSV export (Member/Pro)
- Dashboard cards: nights-at-risk, time-to-freeze estimate, week vs last year, door duration & history
- Opt-in public city freeze-risk map ([/freeze-map](https://thermaltrace.dev/freeze-map)); embed at `/embed/freeze-map`
- Live SSE stream + polling fallback; PWA offline stale cache
- Embeddable live widget for share links (`/embed/<token>`)

### Alerts & digests

- Threshold alerts (freeze, humidity, rate-of-change, outage) on cron **and** push ingest
- Battery / RSSI / battery-trend device health alerts
- Snooze (24h) and vacation (7d); clear actions; one-click links in Telegram/Slack
- Forecast freeze look-ahead (OpenWeather 3h steps)
- Composite AND rules (door + temp, flood, power, …) with optional value/label filters
- Quiet hours (optional freeze bypass; Pro SMS-critical override)
- Per-kind severity routing and per-space channel routing
- Channels: email, Discord, Telegram, Slack, Teams, ntfy, Pushover, WhatsApp; Pro adds SMS (Twilio), browser push, outbound / reading webhooks
- Custom alert templates (`{{kind}}`, `{{title}}`, `{{body}}`) and one-click acknowledgment (dashboard + email/Telegram links)
- **Alert playbooks** — timed escalation steps (e.g. SMS 15 min later if unacknowledged); visual step builder on Alerts page
- Escalation (SMS repeat), test alert with per-channel feedback, activity audit trail
- **Portfolio view** (Pro) — cross-property freeze risk table + optional portfolio freeze email alerts
- Weekly digest (Mondays), monthly freeze report (1st + HTML attachment), quarterly seasonal report
- Onboarding drip emails (days 1 / 3 / 7) and Stripe trial reminders (3d / 1d)

Display preferences, alert settings, snooze/vacation, and household invites save via **Astro Actions** (no full page reload). Legacy form POST routes remain as fallbacks.

### Accounts & collaboration

- Email/password auth, password reset, optional OAuth (Google / GitHub / Discord in Supabase)
- Public [/pricing](https://thermaltrace.dev/pricing) (monthly/annual toggle, env-driven display prices) and [/compare](https://thermaltrace.dev/compare)
- Contextual upgrade nudges where Member/Pro unlocks a feature
- Households: invite by email (member or viewer), rename, leave, revoke, multi-property switcher
- Device transfer between properties; household activity log
- Pro: public share links (live / history / metrics / embed), inbound webhooks (snooze, vacation, status, …), dashboard API keys (`GET /api/v1/metrics`), **v1 devices API** (`POST /api/v1/devices`), Grafana dashboard JSON
- **MQTT bridge** ingest (`POST /api/ingest/mqtt`) for Home Assistant / Mosquitto payloads
- Public status pages (`/status/<token>`), iCal freeze outlook, JSON export (`GET /api/user/export`)
- Referral program: invite link; referred signups get +7 Pro trial days; referrer rewarded on Pro subscribe
- Pro checkout: 14-day trial + Stripe promotion codes

### Ops & content

- Hourly Worker cron: history, alerts, freeze-map snapshots, drips, trial mail, monthly/quarterly reports
- Admin: users, contacts, jobs, **ops dashboard** (`/dashboard/ops`) — checkout funnel, Stripe price audit, referrals, email smoke tests, page errors
- Middleware → `server_errors` + ops email/Discord notify (cooldown per path)
- Public [/system-status](https://thermaltrace.dev/system-status), friendly `/500`, case study `/stories/garage-freeze-alert`
- About / docs hub with search, wiring guides, firmware notes
- Contact form (Cloudflare Email + Turnstile)
- CI: full-repo `tsc`, Vitest, Astro build, Playwright E2E; Astro import-guard tests on all pages

---

## Plans (entitlements)

| Capability | Free | Member | Pro |
|------------|:----:|:------:|:---:|
| Live readings, devices, history browse | ✓ | ✓ | ✓ |
| Email + Discord + Telegram + Slack alerts | ✓ | ✓ | ✓ |
| CSV history export | | ✓ | ✓ |
| Push devices | 2 | 6 | 24 |
| SMS, browser push, outbound / reading webhooks | | | ✓ |
| Public share links, status pages, metrics API | | | ✓ |
| Portfolio view + cross-property freeze alerts | | | ✓ |
| Dashboard API keys + Grafana JSON | | | ✓ |

Exact limits live in [`src/lib/entitlements.ts`](src/lib/entitlements.ts). Display prices on `/pricing` must match live Stripe unit amounts (see [Deploy & ops](#deploy--ops)).

---

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Astro 6, Preact islands, Tailwind CSS v4 |
| Deploy | Cloudflare Workers (`@astrojs/cloudflare`) |
| Auth & DB | Supabase (Auth, Postgres, RLS) |
| Billing | Stripe (Free / Member / Pro; monthly + annual) |
| Email | Cloudflare Email Sending (`MAILER` binding) |
| SMS | Twilio (Pro) |
| Push | Web Push + VAPID (Pro) |
| Forms | Astro Actions (+ form POST fallbacks) |

Requires **Node.js `>=22.12.0`** and **pnpm**.

---

## Architecture

### App shape

- **SSR by default** (`output: 'server'`) on Cloudflare Workers
- Dashboard uses a fixed **app shell** (`DashboardLayout`): sidebar + header + `<main>`
- Prefer **Astro components** for structure; hydrate Preact only where client state is required (`client:visible` / `client:load`)
- Shared dashboard chrome: `src/components/dashboard/` (`DashboardCard`, `MetricCard`, grids, skeletons)

### Mutations

| Flow | Mechanism |
|------|-----------|
| Display prefs, alert settings, snooze/vacation, household invite | `src/actions/index.ts` (Astro Actions) |
| Devices, feeds, Stripe, ingest, most admin forms | `src/pages/api/**` form/JSON routes |
| Background work | `src/worker.ts` `scheduled` handler |

### Data

- Canonical storage is **household devices + sensors + readings** (legacy temp-feed rows auto-migrate into Devices)
- Alert settings live in Postgres (`alert_settings`) with metadata helpers in `src/lib/alerts.ts` / `notify.ts`
- Shared form parsing for alerts: `src/lib/alertSettingsForm.ts`

### Conventions

Cursor rules under [`.cursor/rules/`](.cursor/rules/) cover Astro architecture, design tokens, dashboard hydration, and performance. Prefer them when editing UI.

---

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in values
pnpm dev               # http://localhost:4321
pnpm test
pnpm typecheck         # full-repo tsc --noEmit
pnpm build
```

```bash
pnpm deploy            # astro build + wrangler deploy (dist/server/wrangler.json)
pnpm test:e2e          # Playwright (needs build / local server per config)
pnpm audit:stripe      # compare STRIPE_DISPLAY_* to live Stripe prices
```

Authenticated alert-settings E2E: set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in `.env`, then:

```bash
pnpm e2e:reset-password   # optional: recreate/reset the E2E user via Supabase admin
pnpm test:e2e:auth
# against production: PLAYWRIGHT_BASE_URL=https://thermaltrace.dev pnpm test:e2e:auth
```

Auth E2E signs in through the Supabase API (sets session cookies) so it does not depend on Turnstile.

---

## Project layout

```
src/
  actions/          Astro Actions (prefs, alerts, invites)
  components/       UI (dashboard/*, history, alerts, about)
  layouts/          Site + dashboard shells
  lib/              Auth, devices, households, alerts, Stripe, mailer, ingest
  pages/            Routes; API under pages/api/
  styles/           global.css, about.css
  worker.ts         Cloudflare fetch + scheduled (cron) entry
supabase/migrations/  Postgres schema & RLS (apply in order)
public/             OpenAPI, HA YAML, Grafana JSON, static assets
scripts/            Operator helpers (e.g. Stripe price audit)
.cursor/rules/      Agent / editor conventions for this repo
```

Useful entry points:

| Area | Path |
|------|------|
| Home live panel | `src/components/LiveTempsPanel.tsx` |
| Push ingest | `src/pages/api/ingest/[key].ts` |
| Devices API | `src/pages/api/devices/index.ts` |
| Cron / alerts | `src/worker.ts`, `src/lib/collectHistory.ts`, `src/lib/alertNotifications.ts` |
| Mail helper | `src/lib/mailer.ts` |
| Actions | `src/actions/index.ts` |

---

## Environment variables

Configure in `.env` (local) and Cloudflare Worker secrets / vars (production). Full list: [`.env.example`](.env.example).

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Browser / auth flows |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB / auth (required with RLS) |
| `GARAGE_TEMP_FEED_URL` | Default public probe JSON feed |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` / `NEXT_PUBLIC_OPENWEATHER_CITY_ID` | Outdoor weather |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_TOKEN` | Contact form bot protection |
| `SMTP_MAIL_FROM` / `SMTP_MAIL_TO` | From address + ops/contact To |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing + webhooks |
| `STRIPE_PRICE_ID` / `STRIPE_PRICE_ID_PRO` | Monthly Member / Pro price IDs |
| `STRIPE_PRICE_ID_ANNUAL` / `STRIPE_PRICE_ID_PRO_ANNUAL` | Annual Member / Pro price IDs |
| `STRIPE_DISPLAY_MEMBER_*` / `STRIPE_DISPLAY_PRO_*` | Display-only USD amounts on `/pricing` (must match Stripe) |
| `PRICING_DEFAULT_INTERVAL` | `annual` or `monthly` default on `/pricing` |
| `TWILIO_*` | Pro SMS (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) |
| `VAPID_*` | Pro browser push — generate with `pnpm generate:vapid` |
| `SITE_URL` / `ORIGIN` | OAuth, password reset, Stripe redirects |
| `CRON_SECRET` | Bearer for manual history cron |
| `OPS_DISCORD_WEBHOOK_URL` | Optional Discord when jobs / pages fail |

Do **not** commit `.env`.

---

## Database

Apply SQL in [`supabase/migrations/`](supabase/migrations/) **in order** (SQL editor or Supabase CLI). Enable RLS only after `SUPABASE_SERVICE_ROLE_KEY` is set in production.

Migrations cover devices/sensors, households/invites, share links, alert settings, contacts, job runs, referrals, server errors, and related indexes/policies.

Regenerate types after schema changes:

```bash
pnpm generate-types
```

---

## Background jobs

Hourly cron (`0 * * * *` in [`wrangler.jsonc`](wrangler.jsonc)) runs via `src/worker.ts`:

- Collect history snapshots
- Evaluate alerts (pull feeds when available; otherwise latest stored readings — push-only households included)
- Freeze-map city aggregates (opt-in)
- Trial reminders and onboarding drips
- Monthly / quarterly reports on schedule
- Retention / housekeeping as configured

Push ingest also evaluates threshold/rule alerts immediately (same cooldowns as cron).

Weekly digests send **Monday 08:00 UTC** when enabled.

Failed jobs appear on the Jobs admin UI and notify ops via `SMTP_MAIL_TO` and optional `OPS_DISCORD_WEBHOOK_URL`.

Manual history collection:

```bash
curl -X POST https://your-domain/api/cron/collect-history \
  -H "Authorization: Bearer $CRON_SECRET"
```

Push ingest (`POST /api/ingest/<key>`): ~64KB max payload, ~60 req/min/device (per Worker isolate).

---

## Outbound email (Cloudflare Email)

`wrangler.jsonc` uses an **unrestricted** `MAILER` `send_email` binding so drip, trial, alert, and digest mail can reach user addresses. That requires **Email Sending** enabled for the `SMTP_MAIL_FROM` domain (e.g. `robmcd.name`):

1. Cloudflare Dashboard → **Email** → **Email Sending**, or  
2. CLI:

```bash
wrangler login
wrangler email sending enable robmcd.name
```

If the binding is locked with `destination_address`, mail to other inboxes fails with `email to … not allowed`. Drip cron treats that as **restricted** (job stays success) until Email Sending is enabled. Contact form still targets `SMTP_MAIL_TO`.

Shared send helpers: [`src/lib/mailer.ts`](src/lib/mailer.ts) (`sendPlainEmail`, `sendMailerRaw`).

---

## Connecting hardware

1. **Dashboard → Devices** → create a push device  
2. Copy the one-time ingest key  
3. Add sensor keys that match your JSON (`door1`, `temp1`, …)  
4. `POST` JSON to `/api/ingest/<key>`

```bash
curl -X POST "https://your-domain/api/ingest/YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"door1": true, "temp1": 42.5, "battery": 87, "rssi": -62}'
```

Optional top-level `battery` / `battery_pct` and `rssi` update device health metadata.

Guides:

- [Ingest & webhooks](https://thermaltrace.dev/about/ingest-and-webhooks)
- [Home Assistant webhook YAML](https://thermaltrace.dev/ha/garage_temp_webhook.yaml)
- [Accounts & dashboard](https://thermaltrace.dev/about/accounts-and-dashboard)
- Full hub: [/about](https://thermaltrace.dev/about)

### Open-source firmware & relays

- [arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever) — probe JSON server  
- [thermaltrace](https://github.com/doodersrage/thermaltrace) — this site  
- [fast-api-relay](https://github.com/doodersrage/fast-api-relay) — optional Python relay  

---

## Documentation (in-app)

| Topic | Path |
|-------|------|
| Hub + search | `/about` |
| Accounts, dashboard, plans | `/about/accounts-and-dashboard` |
| Ingest API & webhooks | `/about/ingest-and-webhooks` |
| Historical data | `/about/historical-data` |
| Probe case study | `/about/temperature-probe-case-study` |
| Arduino wiring / sketches | `/about/arduino-*` |
| Display preferences | `/about/display-preferences-deep-dive` |
| PWA install | `/about/install-pwa` |
| HTTP API reference | `/docs/api` |
| System status | `/system-status` |

---

## Deploy & ops

```bash
pnpm ops:check              # verify .env has core keys
pnpm test && pnpm typecheck && pnpm build
pnpm db:push                # apply Supabase migrations (NWS freeze columns)
pnpm secrets:push           # sync .env → Worker secrets (Twilio, VAPID, Stripe, …)
pnpm deploy
```

After deploy:

1. Worker name stays **`garage-temp`** on Cloudflare (routes/secrets unchanged); product brand is **ThermalTrace**
2. Set `SITE_URL` / `ORIGIN` Worker secrets to your public hostname
3. Confirm hourly cron (`0 * * * *`) is active
4. Confirm Email Sending for `SMTP_MAIL_FROM` (see [Outbound email](#outbound-email-cloudflare-email))
5. Point Stripe webhooks at `/api/stripe/webhook` with `STRIPE_WEBHOOK_SECRET`
6. Optional: `node --env-file=.env scripts/rename-stripe-products.mjs` to rename Stripe product labels

Keep display amounts aligned with live Stripe:

```bash
pnpm audit:stripe
# or open /dashboard/ops → Stripe display price audit
```

### GitHub Actions deploy

Add repository secrets (one-time):

```bash
CLOUDFLARE_API_TOKEN=... pnpm setup:github-secrets
```

Or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` manually under **Settings → Secrets → Actions**. Pushes to `main` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) when secrets exist; otherwise deploy is skipped (use `pnpm deploy` locally).

### Custom domain (`thermaltrace.dev`)

The Worker binds **thermaltrace.dev** (and **www** → apex via middleware). Legacy hostnames redirect with 301:

- `garage-temp.robmcd.name`
- `thermaltrace.robmcd.name`
- `garage-temp.doodersrage.workers.dev`

Set Worker secrets `SITE_URL` and `ORIGIN` to `https://thermaltrace.dev`, then `pnpm secrets:push`.

### Public smoke (no auth)

```bash
pnpm smoke:public
# or: pnpm smoke:public https://garage-temp.doodersrage.workers.dev
pnpm ops:smoke              # smoke + sitemap coverage + search-engine ping
pnpm ping:sitemaps          # Google/Bing sitemap ping only
```

Also submit `https://thermaltrace.dev/sitemap-index.xml` in [Google Search Console](https://search.google.com/search-console) → Sitemaps.

Sitemaps are served by SSR routes (`/sitemap-0.xml`, `/sitemap-index.xml`) so they stay available on Cloudflare Workers even when static Asset uploads omit the build-time XML files.

Admin channel tests (SMS/push) still run from **Dashboard → Ops** after sign-in.

### Post-deploy smoke checklist

- [ ] `/system-status` — healthy + recent cron runs  
- [ ] `/pricing` — amounts match Stripe (monthly/annual toggle)  
- [ ] `/compare`, `/docs/api`, case study CTAs → `/pricing`  
- [ ] Dashboard → **Ops** (admin) — email + **channel smoke tests** (SMS/push when configured)  
- [ ] Enable **NWS freeze alerts** under Alerts after migration  
- [ ] Save display prefs / alert settings (Actions) without full reload  
- [ ] Optional: `OPS_DISCORD_WEBHOOK_URL` for failure Discord  
- [ ] Test alert → Share page webhook delivery log (Pro)  

CI on every push to `main`: `astro sync` + typecheck, unit tests, build, Playwright smoke.

---

## Development tips

- Run `pnpm test` and `pnpm typecheck` before deploy; use `pnpm test:e2e` for browser smoke
- Prefer pure Astro for dashboard structure; islands only for interactive charts/forms that need client state
- New dashboard panels should use `DashboardCard` / tokens in `src/styles/global.css`
- OAuth providers must be enabled in Supabase; keep password sign-in form-first when providers are unused
- VAPID keys are required for Pro push — run `pnpm generate:vapid` once and store the printed values as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` secrets (format matches `@block65/webcrypto-web-push`)
- Import-guard Vitest suite fails the build if a page renders a component it never imports

---

## License

Released under the [MIT License](LICENSE). Contributions and forks welcome — open an issue if you hit a rough edge in setup or docs.
