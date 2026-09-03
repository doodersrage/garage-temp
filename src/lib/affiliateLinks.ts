/**
 * Optional Amazon Associates / Adafruit affiliate query params for hardware BOM links.
 * When unset, URLs stay clean; commerce links still use sponsored rel for FTC clarity.
 */

import { getRuntimeEnv } from "./runtimeEnv";

export const COMMERCE_LINK_REL = "sponsored noopener noreferrer";

function cleanTag(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function getAmazonAssociateTag(): string | null {
  return cleanTag(
    getRuntimeEnv("PUBLIC_AMAZON_ASSOCIATE_TAG") ??
      getRuntimeEnv("AMAZON_ASSOCIATE_TAG"),
  );
}

export function getAdafruitAffiliateRef(): string | null {
  return cleanTag(
    getRuntimeEnv("PUBLIC_ADAFRUIT_AFFILIATE_ID") ??
      getRuntimeEnv("ADAFRUIT_AFFILIATE_ID"),
  );
}

/** Append Amazon Associates `tag` when configured. */
export function withAmazonTag(url: string, tag = getAmazonAssociateTag()): string {
  if (!tag) return url;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)amazon\./i.test(parsed.hostname)) return url;
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Append Adafruit `ada_ref` when configured. */
export function withAdafruitRef(url: string, ref = getAdafruitAffiliateRef()): string {
  if (!ref) return url;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)adafruit\.com$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set("ada_ref", ref);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function affiliateHref(url: string): string {
  if (/amazon\./i.test(url)) return withAmazonTag(url);
  if (/adafruit\.com/i.test(url)) return withAdafruitRef(url);
  return url;
}
