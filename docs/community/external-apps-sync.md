# External apps — doc sync checklist

ThermalTrace ships in multiple repos. When onboarding UX changes in **this** repo, check whether sibling projects need a README or marketing pass.

## thermaltrace-home-assistant (HACS)

**Repo:** [github.com/doodersrage/thermaltrace-home-assistant](https://github.com/doodersrage/thermaltrace-home-assistant)

**Status (2026-03):** README aligns with share-link + optional `thermaltrace.push` ingest service. No code change required for recent dashboard UX (pull tab, reveal key, demo pull) — HA users typically use share links or push via service.

**Re-sync when:**

- Push payload shapes or ingest URL path changes
- New sensor kinds or inbound webhook actions
- HACS default store PR [#10550](https://github.com/hacs/default/pull/10550) merges → update badge in `src/lib/integrationsHub.ts` here

**Canonical product docs:** [thermaltrace.dev/integrations/home-assistant](https://thermaltrace.dev/integrations/home-assistant)

## thermaltrace-android

**Repo:** [github.com/doodersrage/thermaltrace-android](https://github.com/doodersrage/thermaltrace-android) (sibling checkout)

**Status:** Consumes live API (`/api/devices/ingest-status`, dashboard extras). No user-facing “one-time key” copy in app strings — device setup stays on the web dashboard.

**Re-sync when:**

- New dashboard API surfaces users expect in mobile (e.g. pull tab management, reveal key)
- Play Store listing copy after `PUBLIC_PLAY_STORE_URL` is set

## This repo (source of truth)

User-facing onboarding: [src/pages/about/adding-devices.astro](../../src/pages/about/adding-devices.astro)

Developer ingest: [docs/ingest/index.md](../ingest/index.md) · [docs/ingest/pull-feeds.md](../ingest/pull-feeds.md)

Operator secrets: `pnpm operator:check` · [operator-checklist.md](./operator-checklist.md)
