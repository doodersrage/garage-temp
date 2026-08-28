import type { APIRoute } from "astro";
import { buildSitemapIndexXml, sitemapXmlResponse } from "../lib/sitemapXml";
import { resolveSiteUrl } from "../lib/schemaMarkup";

export const prerender = false;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = resolveSiteUrl(site);
  return sitemapXmlResponse(buildSitemapIndexXml(siteUrl));
};
