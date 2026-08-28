#!/usr/bin/env node
/**
 * Post-deploy checklist — verifies local .env has keys needed for alerts & billing.
 * Usage: pnpm ops:check
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    label: "Stripe",
    keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID", "STRIPE_PRICE_ID_PRO"],
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

for (const group of groups) {
  const missing = group.keys.filter((k) => !env[k]?.trim());
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
console.log("  pnpm db:push          — apply Supabase migrations");
console.log("  pnpm secrets:push     — sync .env secrets to Cloudflare Worker");
console.log("  pnpm smoke:public     — verify production pages after deploy");
console.log("  Supabase dashboard    — enable TOTP MFA if using MFA enroll UI");
console.log("  Dashboard → Ops       — run email + channel smoke tests after deploy");

process.exit(failed ? 1 : 0);
