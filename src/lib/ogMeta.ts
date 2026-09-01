import { BRAND_NAME } from "./brand";

/** Standard Open Graph share image size (Facebook / LinkedIn / X). */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = "image/jpeg";

export const DEFAULT_OG_IMAGE_PATH = "/og-dashboard.jpg";

/** Pathname → public OG asset for marketing surfaces. */
export function resolveOgImagePath(pathname: string): string {
  const path = pathname.split("?")[0] || "/";

  if (path.startsWith("/pricing") || path.startsWith("/compare")) {
    return "/og-pricing.jpg";
  }
  if (path.startsWith("/freeze-map") || path.startsWith("/freeze-season")) {
    return "/og-freeze-map.jpg";
  }
  if (path.startsWith("/demo") || path.startsWith("/share-kit")) {
    return DEFAULT_OG_IMAGE_PATH;
  }
  if (path.startsWith("/about") || path.startsWith("/guides")) {
    return "/og-about.jpg";
  }
  if (path.startsWith("/stories")) {
    return "/og-story-freeze.jpg";
  }
  if (path.startsWith("/docs")) {
    return "/og-api.jpg";
  }
  if (path.startsWith("/android")) {
    return "/og-android.jpg";
  }
  if (path === "/contact" || path === "/privacy" || path === "/terms") {
    return DEFAULT_OG_IMAGE_PATH;
  }
  if (path === "/system-status") {
    return DEFAULT_OG_IMAGE_PATH;
  }

  return DEFAULT_OG_IMAGE_PATH;
}

export function resolveOgImageAlt(pathname: string): string {
  const path = pathname.split("?")[0] || "/";

  if (path.startsWith("/pricing") || path.startsWith("/compare")) {
    return `${BRAND_NAME} plans and pricing — Free, Member, Pro, and Portfolio freeze alert tiers`;
  }
  if (path.startsWith("/freeze-map") || path.startsWith("/freeze-season")) {
    return `${BRAND_NAME} opt-in freeze-risk map of city-level garage temperatures`;
  }
  if (path.startsWith("/demo")) {
    return `${BRAND_NAME} live garage temperature demo — no account required`;
  }
  if (path.startsWith("/share-kit")) {
    return `${BRAND_NAME} share kit — freeze map embeds and community post copy`;
  }
  if (path.startsWith("/about") || path.startsWith("/guides")) {
    return `${BRAND_NAME} guides for probes, firmware, freeze alerts, and ingest`;
  }
  if (path.startsWith("/stories")) {
    return `${BRAND_NAME} customer story: freeze-risk alert before garage pipes freeze`;
  }
  if (path.startsWith("/docs")) {
    return `${BRAND_NAME} HTTP API — ingest, metrics, webhooks, and OpenAPI`;
  }
  if (path.startsWith("/android")) {
    return `${BRAND_NAME} Android companion — early access on GitHub while Google Play review finishes`;
  }

  return `${BRAND_NAME} garage sensor dashboard with live curves and freeze alerts`;
}

export function absoluteOgImageUrl(siteUrl: string, imagePathOrUrl: string): string {
  if (/^https?:\/\//i.test(imagePathOrUrl)) return imagePathOrUrl;
  const base = siteUrl.replace(/\/+$/, "");
  const path = imagePathOrUrl.startsWith("/") ? imagePathOrUrl : `/${imagePathOrUrl}`;
  return `${base}${path}`;
}
