import type { APIRoute } from "astro";
import { resolveSiteUrl } from "../lib/schemaMarkup";

export const prerender = false;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = resolveSiteUrl(site);
  const sitemapURL = new URL("sitemap-index.xml", `${siteUrl}/`);
  const body = `User-agent: *
Allow: /

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
