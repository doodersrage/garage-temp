#!/usr/bin/env node
/**
 * Notify search engines about the sitemap (best-effort ping).
 * Usage: pnpm ping:sitemaps [baseUrl]
 */
const base = (process.argv[2] ?? process.env.SITE_URL ?? "https://thermaltrace.dev").replace(
  /\/+$/,
  "",
);
const sitemapUrl = `${base}/sitemap-index.xml`;

const pingTargets = [
  { name: "Google", url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
  { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
];

let failed = 0;
let warned = 0;

console.log(`Sitemap: ${sitemapUrl}\n`);

for (const target of pingTargets) {
  try {
    const res = await fetch(target.url, { method: "GET", redirect: "follow" });
    if (res.ok) {
      console.log(`✓ ${target.name} ping — HTTP ${res.status}`);
    } else {
      console.log(
        `⚠ ${target.name} ping — HTTP ${res.status} (endpoint may be deprecated; use Search Console)`,
      );
      warned += 1;
    }
  } catch (error) {
    console.log(
      `⚠ ${target.name} ping — ${error instanceof Error ? error.message : error}`,
    );
    warned += 1;
  }
}

console.log(
  "\nSubmit manually in Google Search Console → Sitemaps → Add:",
  sitemapUrl,
);

if (warned) {
  console.log(`\n${warned} ping(s) did not succeed — this is expected for some engines.`);
}

process.exit(failed ? 1 : 0);
