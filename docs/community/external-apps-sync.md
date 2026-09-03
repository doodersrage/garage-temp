# External apps — doc sync checklist

ThermalTrace ships in multiple repos. When onboarding UX changes in **this** repo, check whether sibling projects need a README or marketing pass.

## thermaltrace-home-assistant (HACS)

**Repo:** [github.com/doodersrage/thermaltrace-home-assistant](https://github.com/doodersrage/thermaltrace-home-assistant)

**Status (2026-09):** README aligns with share-link + optional `thermaltrace.push` ingest service. No code change required for Overview Insights metrics (ΔT, probe spread, humidity overlay, air/RSSI cards) — those are web-dashboard SSR only. HA users typically use share links or push via service.

**Re-sync when:**

- Push payload shapes or ingest URL path changes
- New sensor kinds or inbound webhook actions
- HACS default store PR [#10550](https://github.com/hacs/default/pull/10550) merges → update badge in `src/lib/integrationsHub.ts` here

**Canonical product docs:** [thermaltrace.dev/integrations/home-assistant](https://thermaltrace.dev/integrations/home-assistant)

## thermaltrace-android

**Repo:** [github.com/doodersrage/thermaltrace-android](https://github.com/doodersrage/thermaltrace-android) (sibling checkout)

**Status (2026-09):** Consumes live API (`/api/home/readings`, history, alerts, claims, `/api/user/home-insights`). Home insights now include `time_to_freeze` (hours, `hits_at`, confidence, source). Home already mirrors heating/condensation insights. Full Overview Status strip (freeze hours, probe spread, feed health, power/motion/air/RSSI Insights cards) remains on the **web dashboard** — mention that in Play/README if listing “dashboard parity.”

**Re-sync when:**

- New dashboard API surfaces users expect in mobile (e.g. pull tab management, reveal key, Overview metric endpoints)
- `time_to_freeze` on `/api/user/home-insights` — Android should show the clock, not only threshold alerts
- Play Store listing copy after `PUBLIC_PLAY_STORE_URL` is set
- Web Overview Insights grow into dedicated mobile screens

## This repo (source of truth)

User-facing onboarding: [Adding devices](https://thermaltrace.dev/about/adding-devices) (source: `src/pages/about/adding-devices.astro`) · [Accounts & dashboard](https://thermaltrace.dev/about/accounts-and-dashboard)

Developer ingest: [docs/ingest/index.md](../ingest/index.md) · [docs/ingest/pull-feeds.md](../ingest/pull-feeds.md)

Operator secrets: `pnpm operator:check` · [operator-checklist.md](./operator-checklist.md)
