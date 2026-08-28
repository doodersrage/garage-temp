# Local development

```bash
git clone https://github.com/doodersrage/thermaltrace.git
cd thermaltrace
pnpm install
cp .env.example .env   # fill Supabase, SITE_URL, etc.
pnpm dev               # http://localhost:4321
```

Useful scripts:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm docs:dev          # this docs site locally (base /thermaltrace/)
pnpm docs:build
```

## Minimum `.env`

See [`.env.example`](https://github.com/doodersrage/thermaltrace/blob/main/.env.example). You typically need:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL` / `ORIGIN` (e.g. `http://localhost:4321`)
- Turnstile keys for register/sign-in (or disable in local flows if your branch allows)

## Deploy (production)

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
