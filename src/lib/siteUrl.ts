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
