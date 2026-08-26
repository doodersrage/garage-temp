import { resolveSiteUrl } from "./schemaMarkup";

export function buildSiteUrl(request?: Request, site?: URL | string | null): string {
  if (site) {
    return resolveSiteUrl(site);
  }

  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }

  return resolveSiteUrl(null);
}

export function buildOAuthCallbackUrl(request: Request, site?: URL | string | null): string {
  return `${buildSiteUrl(request, site)}/api/auth/callback`;
}

/** Allow only same-origin relative paths (blocks protocol-relative //evil). */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

export const OAUTH_NEXT_COOKIE = "oauth_next";
