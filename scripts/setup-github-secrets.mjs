#!/usr/bin/env node
/**
 * Set GitHub Actions secrets for Cloudflare deploy builds.
 *
 * Astro inlines import.meta.env at build time — Deploy must NOT use CI placeholders
 * or production auth will break. This syncs .env → GitHub secrets used by deploy.yml.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... pnpm setup:github-secrets
 *   # optional: CLOUDFLARE_ACCOUNT_ID=...
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Keys needed at `astro build` time for a production Worker bundle. */
const BUILD_SECRET_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GARAGE_TEMP_FEED_URL",
  "OPENWEATHER_API_KEY",
  "OPENWEATHER_CITY_ID",
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
  "SITE_URL",
  "ORIGIN",
  "CRON_SECRET",
  "OPS_DISCORD_WEBHOOK_URL",
  "SENTRY_DSN",
  "PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_URL",
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

function setSecret(name, value) {
  execSync(`gh secret set ${name}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log(`✓ ${name}`);
}

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId =
  process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "9efb4c64e198020c56125722f95aae7f";

if (!token) {
  console.error("Set CLOUDFLARE_API_TOKEN (from Cloudflare Dashboard → API Tokens).");
  console.error("Account ID default: 9efb4c64e198020c56125722f95aae7f");
  console.error("Usage: CLOUDFLARE_API_TOKEN=... pnpm setup:github-secrets");
  process.exit(1);
}

const envPath = resolve(".env");
if (!existsSync(envPath)) {
  console.error("No .env file — needed to sync production build secrets to GitHub.");
  process.exit(1);
}

const parsed = parseEnvFile(envPath);
const siteUrl = parsed.SITE_URL?.trim() ?? "";
if (!siteUrl.includes("thermaltrace.dev") && !process.env.ALLOW_NON_PROD_GITHUB_SECRETS) {
  console.error(
    `Refusing: SITE_URL is "${siteUrl || "(empty)"}". Production GitHub secrets should use https://thermaltrace.dev`,
  );
  process.exit(1);
}

setSecret("CLOUDFLARE_API_TOKEN", token);
setSecret("CLOUDFLARE_ACCOUNT_ID", accountId);

let synced = 0;
let skipped = 0;
for (const key of BUILD_SECRET_KEYS) {
  const value = parsed[key]?.trim();
  if (!value) {
    skipped += 1;
    continue;
  }
  setSecret(key, value);
  synced += 1;
}

console.log(
  `\nSynced ${synced} build secrets from .env (${skipped} empty keys skipped).`,
);
console.log("GitHub Actions Deploy can now build and publish a real production Worker.");
