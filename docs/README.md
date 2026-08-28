# Docs site (VitePress → GitHub Pages)

Developer docs only. Product guides stay on https://thermaltrace.dev/about.

```bash
pnpm --dir docs install
pnpm --dir docs dev      # http://localhost:5173/thermaltrace/
pnpm --dir docs build    # → docs/.vitepress/dist
```

Published at: https://doodersrage.github.io/thermaltrace/

Deploy: `.github/workflows/docs.yml` on push to `main` (paths under `docs/`, `sketches/`, `public/openapi.yaml`).
