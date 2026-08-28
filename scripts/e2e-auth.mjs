#!/usr/bin/env node
/**
 * Run authenticated Playwright tests with credentials from .env.
 * Usage: PLAYWRIGHT_BASE_URL=https://thermaltrace.dev pnpm test:e2e:auth
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  process.loadEnvFile?.(envFile);
}

const result = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", "e2e/alert-settings.spec.ts"],
  { stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
