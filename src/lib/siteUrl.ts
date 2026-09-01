import { resolveConfiguredSiteUrl } from "./siteConfig";

export function buildSiteUrl(request?: Request, site?: URL | string | null): string {
  if (site) {
    return resolveConfiguredSiteUrl(site);
  }

  if (request) {
    const fromEnv =
      import.meta.env.SITE_URL?.trim() ||
      import.meta.env.ORIGIN?.trim();
    if (fromEnv) {
      return fromEnv.replace(/\/+$/, "");
    }

    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }

  return resolveConfiguredSiteUrl();
}

export function buildOAuthCallbackUrl(request: Request, site?: URL | string | null): string {
  return `${buildSiteUrl(request, site)}/api/auth/callback`;
}

export function buildGitHubOAuthCallbackUrl(
  request: Request,
  site?: URL | string | null,
): string {
  return `${buildSiteUrl(request, site)}/api/auth/github/callback`;
}

/** Allow only same-origin relative paths (blocks protocol-relative //evil). */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  // Block scheme-relative and backslash tricks some browsers normalize oddly.
  if (trimmed.includes("\\") || trimmed.includes("\0")) return null;
  return trimmed;
}

/**
 * Read a form `redirect` field safely. Absolute URLs and protocol-relative
 * paths fall back so open redirects cannot exfiltrate secrets via Location.
 */
export function formRedirectPath(
  formData: FormData,
  fallback: string,
  field = "redirect",
): string {
  return (
    sanitizeNextPath(formData.get(field)?.toString()) ??
    sanitizeNextPath(fallback) ??
    "/dashboard"
  );
}

export const OAUTH_NEXT_COOKIE = "oauth_next";
export const OAUTH_REF_COOKIE = "oauth_ref";
export const GITHUB_OAUTH_STATE_COOKIE = "github_oauth_state";

/** CSRF state cookie for the thermostat-provider connect/callback round trip. */
export const THERMOSTAT_OAUTH_STATE_COOKIE = "thermostat_oauth_state";
