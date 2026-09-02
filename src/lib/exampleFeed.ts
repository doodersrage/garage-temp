import { DEFAULT_SITE_URL, resolveConfiguredSiteUrl, resolvePageUrl } from "./siteConfig";

/** Public HTTPS pull/push example feed (weather-driven simulated probes). */
export const EXAMPLE_FEED_PATH = "/api/feeds/example";

export function getExampleFeedUrl(siteUrl?: string | URL | null): string {
  return resolvePageUrl(resolveConfiguredSiteUrl(siteUrl), EXAMPLE_FEED_PATH);
}

export function getExampleFeedDocumentUrl(siteUrl?: string | URL | null): string {
  return `${getExampleFeedUrl(siteUrl)}?format=document`;
}

/** Default pull feed when GARAGE_TEMP_FEED_URL is unset (self-hosted demo). */
export function getDefaultPublicFeedUrl(): string {
  const fromEnv = String(import.meta.env.GARAGE_TEMP_FEED_URL ?? "")
    .replace(/\r/g, "")
    .trim();
  if (fromEnv) return fromEnv;
  return `${DEFAULT_SITE_URL}${EXAMPLE_FEED_PATH}`;
}
