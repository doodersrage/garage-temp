import { aboutPages } from "./aboutPages";

/** About slugs that redirect elsewhere — omit from sitemap. */
const EXCLUDED_ABOUT_SLUGS = new Set(["zapier-integration"]);

/** Public marketing and docs paths (not auth, dashboard, or token routes). */
const STATIC_PUBLIC_PATHS = [
  "/",
  "/about",
  "/guides",
  "/pricing",
  "/compare",
  "/compare/diy-mqtt",
  "/compare/govee",
  "/compare/tempest",
  "/contact",
  "/privacy",
  "/terms",
  "/freeze-map",
  "/freeze-season",
  "/demo",
  "/share-kit",
  "/system-status",
  "/docs/api",
  "/android",
  "/stories",
  "/stories/garage-freeze-alert",
  "/stories/cabin-winter-watch",
  "/stories/server-closet-heat",
  "/stories/pipe-near-miss",
] as const;

/** Pathnames for every public page that should appear in the XML sitemap. */
export function getPublicSitemapPaths(): string[] {
  const aboutPaths = aboutPages
    .filter((page) => !EXCLUDED_ABOUT_SLUGS.has(page.slug))
    .map((page) => `/about/${page.slug}`);

  return [...new Set([...STATIC_PUBLIC_PATHS, ...aboutPaths])];
}

/** Absolute URLs for @astrojs/sitemap `customPages`. */
export function buildPublicSitemapUrls(site: string): string[] {
  const base = site.replace(/\/+$/, "");
  return getPublicSitemapPaths().map((path) => `${base}${path}`);
}
