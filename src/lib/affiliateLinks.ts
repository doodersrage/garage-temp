/**
 * Optional Amazon Associates `tag` for hardware BOM buy links.
 * Adafruit does not run an affiliate program — those links stay clean.
 * When the Amazon tag is unset, Amazon URLs stay clean too.
 */

import { getRuntimeEnv } from "./runtimeEnv";

/** Use on Amazon Associates links (FTC: sponsored). */
export const COMMERCE_LINK_REL = "sponsored noopener noreferrer";

/** Use on non-affiliate outbound shop links (Adafruit, PJRC, etc.). */
export const EXTERNAL_SHOP_LINK_REL = "noopener noreferrer";

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

/** `rel` for a shop URL: sponsored only when it is (or will be) an Amazon Associates link. */
export function commerceLinkRel(url: string): string {
  try {
    if (/(^|\.)amazon\./i.test(new URL(url).hostname)) return COMMERCE_LINK_REL;
  } catch {
    /* ignore */
  }
  return EXTERNAL_SHOP_LINK_REL;
}

export function affiliateHref(url: string): string {
  if (/amazon\./i.test(url)) return withAmazonTag(url);
  return url;
}
