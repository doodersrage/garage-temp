/**
 * Resolve config values that may be:
 * - set as Cloudflare Worker secrets (runtime), or
 * - baked into the Worker at `astro build` via import.meta.env.
 *
 * Prefer the Worker runtime value so `pnpm secrets:push` takes effect without
 * waiting for a rebuild. Fall back to import.meta.env for local/dev and tests.
 */
import { env as cloudflareEnv } from "cloudflare:workers";

function readEnvRecord(
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function getRuntimeEnv(key: string): string | undefined {
  try {
    const fromWorker = readEnvRecord(
      cloudflareEnv as unknown as Record<string, unknown>,
      key,
    );
    if (fromWorker) return fromWorker;
  } catch {
    // Outside Workers (vitest / Node scripts).
  }

  return readEnvRecord(import.meta.env as unknown as Record<string, unknown>, key);
}

export function hasRuntimeEnv(...keys: string[]): boolean {
  return keys.every((key) => Boolean(getRuntimeEnv(key)));
}
