# Operator checklist (ThermalTrace)

Tasks only **you** can complete — everything else in the HACS/integration pass is shipped.

## Waiting on HACS maintainers

- [ ] **[hacs/default#10550](https://github.com/hacs/default/pull/10550)** — default store listing (all automated checks green; in FIFO review queue)
- After merge: flip `HACS_BADGE_URL` in `src/lib/integrationsHub.ts` from Custom → Default badge

## Growth (copy/paste ready)

- [ ] **Home Assistant forum** — [community post draft](./home-assistant-forum-post.md) → post in Share your Projects / Third party integrations
- [ ] **Discord / social** — [announcement draft](./discord-hacs-announcement.md)

## Thermostat OAuth (Pro feature)

Connect UI stays hidden until Worker secrets exist. Full steps: [thermaltrace.dev/about/thermostat-oauth](https://thermaltrace.dev/about/thermostat-oauth)

1. **Nest** — [Device Access Console](https://console.nest.google.com/device-access) + Google Cloud OAuth web client  
   Redirect URI: `https://thermaltrace.dev/api/integrations/nest/callback`  
   Secrets: `NEST_CLIENT_ID`, `NEST_CLIENT_SECRET`, `NEST_PROJECT_ID`

2. **Ecobee** — [Developer portal](https://www.ecobee.com/en-us/developer/)  
   Redirect URI: `https://thermaltrace.dev/api/integrations/ecobee/callback`  
   Secret: `ECOBEE_CLIENT_ID` (no client secret)

3. Add values to `.env`, then: `pnpm secrets:push`

## Google Play

- [ ] When review clears, update `/android` and marketing copy from GitHub early access → Play Store link

## WebAuthn MFA

- [ ] Re-enable `MFA_WEBAUTHN_UI_ENABLED` in `src/lib/mfaWebAuthnUi.ts` when Supabase Cloud supports WebAuthn MFA

## Already done (no action)

- HACS integration repo: [thermaltrace-home-assistant](https://github.com/doodersrage/thermaltrace-home-assistant) v1.0.2
- Product pages: `/integrations`, `/integrations/home-assistant`
- Dashboard share-link → HACS nudge
- Deploy + `pnpm build` in CI
- 15-minute cron polling, stale/battery UX, ops cron-gap alerts
