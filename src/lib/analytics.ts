import { isDashboardConversionPath } from "./productAnalytics";

/** Default GA4 measurement ID — override with GA_MEASUREMENT_ID in env. */
export const DEFAULT_GA_MEASUREMENT_ID = "G-1TLGYJZEQ9";

/**
 * Third-party script hosts used by marketing analytics.
 * Include these in script-src if you add a Content-Security-Policy later.
 */
export const ANALYTICS_CSP_SCRIPT_HOSTS = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://analytics.ahrefs.com",
] as const;

const ANALYTICS_EXCLUDED_PREFIXES = ["/dashboard", "/api/"];

export function resolveGaMeasurementId(
  env?: Pick<ImportMetaEnv, "GA_MEASUREMENT_ID">,
): string | null {
  const fromEnv =
    env?.GA_MEASUREMENT_ID?.trim() ||
    import.meta.env.GA_MEASUREMENT_ID?.trim() ||
    "";

  if (fromEnv === "off" || fromEnv === "false" || fromEnv === "0") {
    return null;
  }

  return fromEnv || DEFAULT_GA_MEASUREMENT_ID;
}

export function shouldLoadGoogleAnalytics(
  pathname: string,
  options?: {
    prod?: boolean;
    disabled?: boolean;
    search?: string | URLSearchParams;
  },
): boolean {
  if (options?.disabled) {
    return false;
  }

  const prod = options?.prod ?? import.meta.env.PROD;
  if (!prod) {
    return false;
  }

  if (isDashboardConversionPath(pathname, options?.search)) {
    return true;
  }

  return !ANALYTICS_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function resolveGaCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    return undefined;
  }

  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join(".")}`;
  }

  return undefined;
}
