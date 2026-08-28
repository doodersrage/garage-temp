# Architecture

ThermalTrace is an **Astro 6** app with **`output: 'server'`** on **Cloudflare Workers**, **Supabase** (Auth + Postgres + RLS), and **Stripe** for paid plans.

```
Sensors / relays ──push or pull──► Cloudflare Worker (Astro)
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
               Supabase DB          Stripe webhooks      Email / SMS / push
               (readings,           (subscriptions)      (alerts, digests)
                devices,
                households)
```

## App shape

- SSR by default; dashboard uses `DashboardLayout` (sidebar + topbar + main)
- Prefer Astro components; hydrate Preact only where needed (`client:visible` / `client:load`)
- Shared chrome under `src/components/dashboard/`

## Mutations

| Flow | Mechanism |
|------|-----------|
| Prefs, alert settings, snooze, invites | Astro Actions (`src/actions/`) |
| Devices, feeds, Stripe, ingest, admin | `src/pages/api/**` |
| Background | `src/worker.ts` `scheduled` (hourly cron) |

## Data model (conceptual)

- **Households** own devices and memberships (roles: owner, member, viewer, …)
- **Devices** are push or pull; **sensors** map JSON keys → labels / kinds
- **Readings** store history; raw rows roll up on a retention schedule
- **Alert settings** drive freeze / humidity / outage / forecast / channel fan-out

## Repo map

```
src/pages/api/ingest/   Push ingest
src/lib/                Devices, alerts, mailer, Stripe, households
src/worker.ts           fetch + cron
supabase/migrations/    Schema + RLS
sketches/               Sample firmware
docs/                   This VitePress site → GitHub Pages
public/openapi.yaml     HTTP API contract
```

## Related product docs

Long-form DIY and ops writing: [thermaltrace.dev/about](https://thermaltrace.dev/about)
