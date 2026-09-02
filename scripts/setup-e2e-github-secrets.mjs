#!/usr/bin/env node
/**
 * Sync E2E credentials from .env → GitHub Actions secrets for ci.yml.
 *
 * Usage: pnpm setup:e2e-github-secrets
 *
 * Requires: gh CLI authenticated, .env with E2E_TEST_EMAIL, E2E_TEST_PASSWORD,
 * SUPABASE_URL, SUPABASE_ANON_KEY (same project as production test user).
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const E2E_KEYS = [
  { github: "SUPABASE_URL", env: "SUPABASE_URL", required: true },
  { github: "SUPABASE_ANON_KEY", env: "SUPABASE_ANON_KEY", required: true },
  { github: "SUPABASE_E2E_TEST_EMAIL", env: "E2E_TEST_EMAIL", required: true },
  { github: "SUPABASE_E2E_TEST_PASSWORD", env: "E2E_TEST_PASSWORD", required: true },
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

const envPath = resolve(".env");
if (!existsSync(envPath)) {
  console.error("No .env file found.");
  process.exit(1);
}

const parsed = parseEnvFile(envPath);
const missing = E2E_KEYS.filter((row) => row.required && !parsed[row.env]?.trim());
if (missing.length > 0) {
  console.error("Missing required .env keys:", missing.map((row) => row.env).join(", "));
  process.exit(1);
}

for (const row of E2E_KEYS) {
  const value = parsed[row.env]?.trim();
  if (!value) continue;
  setSecret(row.github, value);
}

console.log("\nCI e2e job will run authenticated specs when ci.yml triggers on push/PR.");
