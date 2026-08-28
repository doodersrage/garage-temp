#!/usr/bin/env node
/**
 * Set GitHub Actions secrets for Cloudflare deploy.
 * Usage: CLOUDFLARE_API_TOKEN=... pnpm setup:github-secrets
 */
import { execSync } from "node:child_process";

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId =
  process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "9efb4c64e198020c56125722f95aae7f";

if (!token) {
  console.error("Set CLOUDFLARE_API_TOKEN (from Cloudflare Dashboard → API Tokens).");
  console.error("Account ID default: 9efb4c64e198020c56125722f95aae7f");
  process.exit(1);
}

function setSecret(name, value) {
  execSync(`gh secret set ${name}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log(`✓ ${name}`);
}

setSecret("CLOUDFLARE_API_TOKEN", token);
setSecret("CLOUDFLARE_ACCOUNT_ID", accountId);
console.log("GitHub Actions can now auto-deploy on push to main.");
