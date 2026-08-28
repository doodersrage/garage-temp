import type { APIRoute } from "astro";
import { buildSitemapUrlsetXml, sitemapXmlResponse } from "../lib/sitemapXml";
import { resolveSiteUrl } from "../lib/schemaMarkup";

export const prerender = false;

/** SSR sitemap — Cloudflare Assets was 404ing the static @astrojs/sitemap files. */
export const GET: APIRoute = ({ site }) => {
  const siteUrl = resolveSiteUrl(site);
  return sitemapXmlResponse(buildSitemapUrlsetXml(siteUrl));
};
