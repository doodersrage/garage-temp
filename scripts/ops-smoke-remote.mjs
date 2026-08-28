#!/usr/bin/env node
/**
 * Post-deploy remote checks (public + sitemap coverage).
 * Usage: pnpm ops:smoke [baseUrl]
 */
import { spawnSync } from "node:child_process";

const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://thermaltrace.dev").replace(
  /\/+$/,
  "",
);

function run(label, command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${result.status})`);
    return false;
  }
  return true;
}

let ok = true;

console.log(`Remote ops smoke for ${base}\n`);

ok &&= run("Public smoke", "node", ["scripts/smoke-public.mjs", base]);

try {
  const res = await fetch(`${base}/sitemap-0.xml`, { redirect: "follow" });
  const xml = await res.text();
  const count = (xml.match(/<loc>/g) ?? []).length;
  if (!res.ok || count < 100) {
    console.log(`✗ Sitemap coverage — HTTP ${res.status}, ${count} URLs (expected ≥100)`);
    ok = false;
  } else {
    console.log(`✓ Sitemap coverage — ${count} URLs`);
  }
  if (!xml.includes("dht22-sensor-overview")) {
    console.log("✗ Sitemap missing expanded about guides");
    ok = false;
  }
} catch (error) {
  console.log(`✗ Sitemap fetch — ${error instanceof Error ? error.message : error}`);
  ok = false;
}

ok &&= run("Search engine ping", "node", ["scripts/ping-sitemaps.mjs", base]);

console.log(
  ok
    ? "\nRemote ops smoke passed. Run Dashboard → Ops email/channel tests while signed in as admin."
    : "\nRemote ops smoke had failures.",
);

process.exit(ok ? 0 : 1);
