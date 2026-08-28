#!/usr/bin/env node
/**
 * Public post-deploy smoke checks (no auth).
 * Usage: pnpm smoke:public [baseUrl]
 */
const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://thermaltrace.dev").replace(
  /\/+$/,
  "",
);

/** @type {Array<{ path: string; title?: RegExp; heading?: RegExp; json?: string; expect?: string; bodyIncludes?: string }>} */
const checks = [
  { path: "/", title: /ThermalTrace/i },
  { path: "/pricing", heading: /Plans that grow/i },
  { path: "/compare", heading: /Built for homeowners/i },
  { path: "/about/", heading: /About ThermalTrace/i },
  { path: "/system-status", heading: /System status/i },
  { path: "/docs/api", heading: /API documentation/i },
  { path: "/privacy", heading: /Privacy/i },
  { path: "/about/zapier-make-recipes", heading: /Zapier.*Make/i },
  { path: "/about/cold-snap-playbook", heading: /Cold-snap/i },
  { path: "/sitemap-0.xml", bodyIncludes: "cold-snap-playbook" },
  { path: "/sitemap-index.xml", bodyIncludes: "sitemap-0.xml" },
  { path: "/robots.txt", bodyIncludes: "Sitemap:" },
  { path: "/manifest.webmanifest", json: "name", expect: "ThermalTrace" },
];

let failed = 0;

for (const check of checks) {
  const url = `${base}${check.path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.log(`✗ ${check.path} — HTTP ${res.status}`);
      failed += 1;
      continue;
    }

    if (check.json) {
      const data = await res.json();
      if (data[check.json] !== check.expect) {
        console.log(`✗ ${check.path} — expected ${check.json}=${check.expect}`);
        failed += 1;
      } else {
        console.log(`✓ ${check.path}`);
      }
      continue;
    }

    const html = await res.text();
    if (check.bodyIncludes && !html.includes(check.bodyIncludes)) {
      console.log(`✗ ${check.path} — missing "${check.bodyIncludes}"`);
      failed += 1;
    } else if (check.title && !check.title.test(html)) {
      console.log(`✗ ${check.path} — title pattern missing`);
      failed += 1;
    } else if (check.heading && !check.heading.test(html)) {
      console.log(`✗ ${check.path} — heading missing`);
      failed += 1;
    } else {
      console.log(`✓ ${check.path}`);
    }
  } catch (error) {
    console.log(`✗ ${check.path} — ${error instanceof Error ? error.message : error}`);
    failed += 1;
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll public smoke checks passed.");
process.exit(failed ? 1 : 0);
