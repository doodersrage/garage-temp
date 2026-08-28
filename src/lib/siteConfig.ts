/** Canonical public site URL — set SITE_URL or ORIGIN in Worker env / .env. */
export const DEFAULT_SITE_URL = "https://garage-temp.robmcd.name";

export function resolveConfiguredSiteUrl(
  siteUrl?: string | URL | null,
  env?: Pick<ImportMetaEnv, "SITE_URL" | "ORIGIN">,
): string {
  if (siteUrl) {
    return siteUrl.toString().replace(/\/+$/, "");
  }

  const fromEnv =
    env?.SITE_URL?.trim() ||
    env?.ORIGIN?.trim() ||
    import.meta.env.SITE_URL?.trim() ||
    import.meta.env.ORIGIN?.trim() ||
    "";

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  return DEFAULT_SITE_URL;
}

export function resolvePageUrl(siteUrl: string, pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl}${normalizedPath}`;
}
