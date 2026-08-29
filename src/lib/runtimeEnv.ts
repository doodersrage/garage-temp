/**
 * Resolve config values that may be:
 * - baked into the Worker at `astro build` via import.meta.env, or
 * - set later as Cloudflare Worker secrets (runtime only).
 *
 * Prefer import.meta.env when present so local/dev and GitHub Deploy builds keep working;
 * fall back to `cloudflare:workers` env so `pnpm secrets:push` takes effect without a rebuild.
 */
import { env as cloudflareEnv } from "cloudflare:workers";

export function getRuntimeEnv(key: string): string | undefined {
  const baked = (import.meta.env as Record<string, unknown>)[key];
  if (typeof baked === "string") {
    const trimmed = baked.trim();
    if (trimmed) return trimmed;
  }

  try {
    const value = (cloudflareEnv as unknown as Record<string, unknown>)[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  } catch {
    // Outside Workers (vitest / Node scripts).
  }

  return undefined;
}

export function hasRuntimeEnv(...keys: string[]): boolean {
  return keys.every((key) => Boolean(getRuntimeEnv(key)));
}
