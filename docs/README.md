# Docs site (VitePress → GitHub Pages)

**Live:** https://doodersrage.github.io/thermaltrace/

Product guides stay on https://thermaltrace.dev/about — this site is the developer reference (ingest, API, sketches, HA, Grafana).

```bash
pnpm --dir docs --ignore-workspace install
pnpm docs:dev      # http://localhost:5173/thermaltrace/
pnpm docs:build
```

Deploy: `.github/workflows/docs.yml` on push to `main` when `docs/`, `sketches/`, or `public/openapi.yaml` change.

On the GitHub repo page: open **Environments → github-pages**, or use the Docs badge in the root README. About → Website remains the production app URL.
