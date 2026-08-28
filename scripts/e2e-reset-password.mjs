#!/usr/bin/env node
/**
 * Reset the dedicated E2E user password via Supabase Admin API and update .env.
 * Usage: pnpm e2e:reset-password
 *
 * Only touches the user matching E2E_TEST_EMAIL. Prints no password.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

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

function upsertEnvKey(path, key, value) {
  const text = readFileSync(path, "utf8");
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, "m").test(text)) {
    writeFileSync(path, text.replace(new RegExp(`^${key}=.*$`, "m"), line));
  } else {
    writeFileSync(path, `${text.trimEnd()}\n${line}\n`);
  }
}

const envPath = resolve(".env");
const env = parseEnvFile(envPath);
const url = env.SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = env.E2E_TEST_EMAIL?.trim();

if (!url || !serviceKey) {
  console.error("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
if (!email) {
  console.error("Set E2E_TEST_EMAIL in .env first");
  process.exit(1);
}

const password = `E2E-${randomBytes(12).toString("base64url")}`;
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listed.error) {
  console.error("listUsers failed:", listed.error.message);
  process.exit(1);
}

const user = listed.data.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);

if (!user) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) {
    console.error("createUser failed:", created.error.message);
    process.exit(1);
  }
  console.log(`Created E2E user ${email}`);
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (updated.error) {
    console.error("updateUserById failed:", updated.error.message);
    process.exit(1);
  }
  console.log(`Updated password for E2E user ${email}`);
}

upsertEnvKey(envPath, "E2E_TEST_PASSWORD", password);
console.log("Wrote E2E_TEST_PASSWORD to .env (not printed).");
console.log("Next: PLAYWRIGHT_BASE_URL=https://thermaltrace.dev pnpm test:e2e:auth");
