import type { APIRoute } from "astro";
import { resolveSiteUrl } from "../lib/schemaMarkup";

export const prerender = false;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = resolveSiteUrl(site);
  const sitemapURL = new URL("sitemap-index.xml", `${siteUrl}/`);
  const body = `User-agent: *
Allow: /

# App shell & auth (not for indexing)
Disallow: /dashboard
Disallow: /api/
Disallow: /signin
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /invite/
Disallow: /share/
Disallow: /status/
Disallow: /embed/

# Keep public docs and marketing crawlable
Allow: /docs/api
Allow: /docs/
Allow: /about
Allow: /pricing
Allow: /compare
Allow: /freeze-map
Allow: /stories/
Allow: /contact
Allow: /privacy
Allow: /terms
Allow: /system-status
Allow: /android
Allow: /openapi.yaml

Sitemap: ${sitemapURL.href}
`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
