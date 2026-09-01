# Deploy & ops

Production app: [thermaltrace.dev](https://thermaltrace.dev).

```bash
pnpm ops:check              # verify .env has core keys
pnpm test && pnpm typecheck && pnpm build
pnpm db:push                # apply Supabase migrations
pnpm secrets:push           # sync .env → Worker secrets
pnpm deploy                 # astro build + wrangler deploy
```

After deploy:

1. **Infra IDs vs brand** — Cloudflare Worker name may stay `garage-temp`; some API paths like `/api/garage-temps/*` are stable URLs. User-facing brand is **ThermalTrace**.
2. Set `SITE_URL` / `ORIGIN` Worker secrets to `https://thermaltrace.dev`
3. Confirm cron triggers (`0 * * * *` and `15,30,45 * * * *` in `wrangler.jsonc`) are active
4. Enable Cloudflare **Email Sending** for the domain in `SMTP_MAIL_FROM` (see below)
5. Point Stripe webhooks at `/api/stripe/webhook` with `STRIPE_WEBHOOK_SECRET`
6. Optional: `node --env-file=.env scripts/rename-stripe-products.mjs` to rename Stripe product labels

Keep display amounts aligned with live Stripe:

```bash
pnpm audit:stripe
# or open /dashboard/ops → Stripe display price audit
```

## Outbound email (Cloudflare Email)

`wrangler.jsonc` uses an unrestricted `MAILER` `send_email` binding so drip, trial, alert, and digest mail can reach user addresses. Enable **Email Sending** for the domain in `SMTP_MAIL_FROM`:

1. Cloudflare Dashboard → **Email** → **Email Sending**, or
2. CLI: `wrangler email sending enable <your-sending-domain>`

If the binding is locked with `destination_address`, mail to other inboxes fails with `email to … not allowed`. Drip cron treats that as **restricted** (job stays success) until Email Sending is enabled. The contact form still targets `SMTP_MAIL_TO`.

Helpers: [`src/lib/mailer.ts`](https://github.com/doodersrage/thermaltrace/blob/main/src/lib/mailer.ts) (`sendPlainEmail`, `sendMailerRaw`).

## GitHub Actions deploy

Astro **inlines** `import.meta.env` at build time. Deploy must use real production secrets — never CI placeholders — or auth breaks.

One-time (Cloudflare API token with Workers edit):

```bash
CLOUDFLARE_API_TOKEN=... pnpm setup:github-secrets
```

That syncs `CLOUDFLARE_*` plus build secrets from `.env` into GitHub Actions secrets. Pushes to `main` then run [`.github/workflows/deploy.yml`](https://github.com/doodersrage/thermaltrace/blob/main/.github/workflows/deploy.yml). Without those secrets the workflow succeeds with a skip notice (use `pnpm deploy` locally).

## Custom domain

The Worker binds **thermaltrace.dev** (and **www** → apex via middleware). Legacy hostnames listed in `wrangler.jsonc` redirect with 301. Set `SITE_URL` and `ORIGIN` to `https://thermaltrace.dev`, then `pnpm secrets:push`.

## Public smoke (no auth)

```bash
pnpm smoke:public
pnpm ops:smoke              # smoke + sitemap coverage + search-engine ping
pnpm ping:sitemaps          # Google/Bing sitemap ping only
```

Submit `https://thermaltrace.dev/sitemap-index.xml` in [Google Search Console](https://search.google.com/search-console) → Sitemaps.

Sitemaps are SSR routes (`/sitemap-0.xml`, `/sitemap-index.xml`) so they stay available on Cloudflare Workers even when static Asset uploads omit build-time XML.

Admin channel tests (SMS/push) run from **Dashboard → Ops** after sign-in.

## Post-deploy smoke checklist

- [ ] `/system-status` — healthy + recent cron runs
- [ ] `/pricing` — amounts match Stripe (monthly/annual toggle)
- [ ] `/compare`, `/docs/api`, case study CTAs → `/pricing`
- [ ] Dashboard → **Ops** (admin) — email + channel smoke tests (SMS/push when configured)
- [ ] Enable **NWS freeze alerts** under Alerts after migration
- [ ] Save display prefs / alert settings (Actions) without full reload
- [ ] Optional: `OPS_DISCORD_WEBHOOK_URL` for failure Discord
- [ ] Test alert → Share page webhook delivery log (Pro)

CI on every push to `main`: `astro sync` + typecheck, unit tests, build, Playwright smoke.
