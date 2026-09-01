#!/usr/bin/env node
/**
 * Push Worker secrets from .env using wrangler secret bulk.
 * Usage: pnpm secrets:push [--env-file .env] [--dry-run]
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const SECRET_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GARAGE_TEMP_FEED_URL",
  "NEXT_PUBLIC_OPENWEATHER_API_KEY",
  "NEXT_PUBLIC_OPENWEATHER_CITY_ID",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_TOKEN",
  "SMTP_MAIL_FROM",
  "SMTP_MAIL_TO",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "STRIPE_PRICE_ID_PRO",
  "STRIPE_PRICE_ID_ANNUAL",
  "STRIPE_PRICE_ID_PRO_ANNUAL",
  "STRIPE_PRICE_ID_PORTFOLIO",
  "STRIPE_PRICE_ID_PORTFOLIO_ANNUAL",
  "STRIPE_DISPLAY_MEMBER_MONTHLY",
  "STRIPE_DISPLAY_MEMBER_ANNUAL",
  "STRIPE_DISPLAY_PRO_MONTHLY",
  "STRIPE_DISPLAY_PRO_ANNUAL",
  "STRIPE_DISPLAY_PORTFOLIO_MONTHLY",
  "STRIPE_DISPLAY_PORTFOLIO_ANNUAL",
  "PRICING_DEFAULT_INTERVAL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "FCM_SERVICE_ACCOUNT_JSON",
  "FCM_PROJECT_ID",
  "FCM_CLIENT_EMAIL",
  "FCM_PRIVATE_KEY",
  "SITE_URL",
  "ORIGIN",
  "CRON_SECRET",
  "OPS_DISCORD_WEBHOOK_URL",
  "YUBICO_CLIENT_ID",
  "YUBICO_API_KEY",
  "NEST_CLIENT_ID",
  "NEST_CLIENT_SECRET",
  "NEST_PROJECT_ID",
  "ECOBEE_CLIENT_ID",
  "SENTRY_DSN",
];

function parseEnvFile(path) {
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const envFileArg = args.find((a) => a.startsWith("--env-file="));
const envPath = resolve(envFileArg?.split("=")[1] ?? ".env");

let parsed;
try {
  parsed = parseEnvFile(envPath);
} catch (error) {
  console.error(`Could not read ${envPath}:`, error.message);
  process.exit(1);
}

const secrets = {};
for (const key of SECRET_KEYS) {
  const value = parsed[key]?.trim();
  if (value) secrets[key] = value;
}

const missing = SECRET_KEYS.filter((k) => !secrets[k]);
const critical = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const missingCritical = critical.filter((k) => !secrets[k]);

if (missingCritical.length > 0) {
  console.error("Missing required secrets in env file:", missingCritical.join(", "));
  process.exit(1);
}

console.log(`Prepared ${Object.keys(secrets).length} secrets (${missing.length} optional keys empty).`);

if (dryRun) {
  console.log("Dry run — would push:", Object.keys(secrets).join(", "));
  process.exit(0);
}

const tmp = resolve(".wrangler-secrets.json");
writeFileSync(tmp, JSON.stringify(secrets, null, 2));

try {
  execSync("pnpm exec wrangler secret bulk .wrangler-secrets.json", {
    stdio: "inherit",
    cwd: resolve("."),
  });
  console.log("Worker secrets updated.");
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
