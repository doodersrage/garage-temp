# Contributing

Thanks for helping improve ThermalTrace. **Bugs and feature ideas** belong in [GitHub issues](https://github.com/doodersrage/thermaltrace/issues). **Account, billing, and household questions** go through the [contact form](https://thermaltrace.dev/contact).

Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Details: [Local development](https://doodersrage.github.io/thermaltrace/guide/local-dev). Do not commit `.env` or secrets.

## Before you open a PR

```bash
pnpm test
pnpm typecheck
```

CI on `main` and pull requests also runs `pnpm build` and Playwright smoke (`pnpm test:e2e`). UI changes should stay consistent across pages that share the same state.

The **import-guard** suite (`src/lib/astroImportGuard.test.ts`) fails if an Astro page renders a component it never imports.

## Branch and PR conventions

- Fork and open a PR against `main`
- Keep the change focused; say **why** in the PR description
- Prefer one-line commit messages in present tense (see `git log`)
- Hardware / ingest bugs: include board, sensors, expected vs observed readings, and feed URLs when you have them

## Where docs live

| Audience | Place |
|----------|--------|
| First-time clone | Root [README.md](./README.md) |
| Env, cron, deploy | [Developer docs](https://doodersrage.github.io/thermaltrace/) (`docs/`) |
| Wiring and freeze playbooks | [Guides hub](https://thermaltrace.dev/guides) |
