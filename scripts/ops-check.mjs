#!/usr/bin/env node
/**
 * Post-deploy checklist — verifies local .env has keys needed for alerts & billing.
 * Usage: pnpm ops:check
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile as parseEnvText } from "./parseEnvFile.mjs";

function parseEnvFile(path) {
  const parsed = parseEnvText(readFileSync(path, "utf8"));
  const out = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value) out[key] = value;
  }
  return out;
}

const envPath = resolve(".env");
let env;
try {
  env = parseEnvFile(envPath);
} catch {
  console.error("No .env file — copy .env.example and fill in values.");
  process.exit(1);
}

const groups = [
  {
    label: "Core",
    keys: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SITE_URL"],
  },
  {
    label: "SMS (Pro)",
    keys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    optional: true,
  },
  {
    label: "Web Push",
    keys: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
    optional: true,
  },
  {
    label: "Android FCM (optional)",
    keys: ["FCM_SERVICE_ACCOUNT_JSON"],
    optional: true,
  },
  {
    label: "E2E auth tests",
    keys: ["E2E_TEST_EMAIL", "E2E_TEST_PASSWORD"],
    optional: true,
  },
  {
    label: "Stripe",
    keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID", "STRIPE_PRICE_ID_PRO", "STRIPE_PRICE_ID_PORTFOLIO"],
  },
  {
    label: "Cron & ack links",
    keys: ["CRON_SECRET"],
    optional: true,
  },
  {
    label: "Email",
    keys: ["SMTP_MAIL_FROM", "SMTP_MAIL_TO"],
  },
];

let failed = false;

const siteUrl = env.SITE_URL?.trim();
if (siteUrl && !siteUrl.includes("thermaltrace.dev")) {
  console.log(
    `⚠ SITE_URL is "${siteUrl}" — production should use https://thermaltrace.dev (run pnpm secrets:push after updating .env)`,
  );
}

for (const group of groups) {
  let missing = group.keys.filter((k) => !env[k]?.trim());
  // FCM can be JSON blob OR split project/email/key.
  if (group.label.startsWith("Android FCM")) {
    const splitOk =
      env.FCM_PROJECT_ID?.trim() &&
      env.FCM_CLIENT_EMAIL?.trim() &&
      env.FCM_PRIVATE_KEY?.trim();
    if (splitOk) missing = [];
  }
  if (missing.length === 0) {
    console.log(`✓ ${group.label}`);
  } else if (group.optional) {
    console.log(`○ ${group.label} (optional — missing: ${missing.join(", ")})`);
  } else {
    console.log(`✗ ${group.label} — missing: ${missing.join(", ")}`);
    failed = true;
  }
}

console.log("\nNext steps:");
console.log("  pnpm secrets:push     — sync .env secrets to Cloudflare Worker");
console.log("  pnpm ops:smoke        — public pages + sitemap after deploy");
console.log("  pnpm ops:dogfood      — alert test + Ops email smokes (needs E2E admin)");
console.log("  pnpm test:e2e:auth    — authenticated alert settings (needs E2E_TEST_*)");
console.log("  GSC                   — confirm https://thermaltrace.dev/sitemap-index.xml in Search Console");
if (!env.TWILIO_ACCOUNT_SID?.trim()) {
  console.log("  Twilio                — add TWILIO_* to .env for SMS/WhatsApp, then secrets:push");
}
if (
  !env.FCM_SERVICE_ACCOUNT_JSON?.trim() &&
  !(env.FCM_PROJECT_ID?.trim() && env.FCM_CLIENT_EMAIL?.trim() && env.FCM_PRIVATE_KEY?.trim())
) {
  console.log(
    "  FCM                   — add FCM_SERVICE_ACCOUNT_JSON (or FCM_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY) for Android push",
  );
}
if (!env.E2E_TEST_EMAIL?.trim() || !env.E2E_TEST_PASSWORD?.trim()) {
  console.log("  E2E                   — set E2E_TEST_EMAIL / E2E_TEST_PASSWORD for Playwright auth");
}

process.exit(failed ? 1 : 0);
