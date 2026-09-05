import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  affiliateHref,
  COMMERCE_LINK_REL,
  commerceLinkRel,
  EXTERNAL_SHOP_LINK_REL,
  withAmazonTag,
} from "./affiliateLinks";

describe("affiliateLinks", () => {
  const env = import.meta.env as Record<string, string | undefined>;
  let prevAmazon: string | undefined;

  beforeEach(() => {
    prevAmazon = env.PUBLIC_AMAZON_ASSOCIATE_TAG;
  });

  afterEach(() => {
    if (prevAmazon == null) delete env.PUBLIC_AMAZON_ASSOCIATE_TAG;
    else env.PUBLIC_AMAZON_ASSOCIATE_TAG = prevAmazon;
    vi.unstubAllGlobals();
  });

  it("exports sponsored commerce rel for Amazon", () => {
    expect(COMMERCE_LINK_REL).toContain("sponsored");
    expect(COMMERCE_LINK_REL).toContain("noopener");
    expect(EXTERNAL_SHOP_LINK_REL).not.toContain("sponsored");
  });

  it("leaves URLs unchanged without an Amazon tag", () => {
    delete env.PUBLIC_AMAZON_ASSOCIATE_TAG;
    expect(withAmazonTag("https://www.amazon.com/s?k=ESP32")).toBe(
      "https://www.amazon.com/s?k=ESP32",
    );
    expect(affiliateHref("https://www.adafruit.com/product/381")).toBe(
      "https://www.adafruit.com/product/381",
    );
  });

  it("appends Amazon Associates tag", () => {
    expect(withAmazonTag("https://www.amazon.com/s?k=ESP32", "thermaltrace-20")).toBe(
      "https://www.amazon.com/s?k=ESP32&tag=thermaltrace-20",
    );
  });

  it("ignores Amazon tags on unrelated hosts", () => {
    expect(withAmazonTag("https://example.com/x", "tag-20")).toBe("https://example.com/x");
    expect(withAmazonTag("https://www.adafruit.com/product/381", "tag-20")).toBe(
      "https://www.adafruit.com/product/381",
    );
  });

  it("routes affiliateHref Amazon-only and leaves Adafruit clean", () => {
    env.PUBLIC_AMAZON_ASSOCIATE_TAG = "thermaltrace-20";
    expect(affiliateHref("https://www.amazon.com/s?k=x")).toContain("tag=thermaltrace-20");
    expect(affiliateHref("https://www.adafruit.com/product/1")).toBe(
      "https://www.adafruit.com/product/1",
    );
  });

  it("picks sponsored rel only for Amazon hosts", () => {
    expect(commerceLinkRel("https://www.amazon.com/s?k=x")).toBe(COMMERCE_LINK_REL);
    expect(commerceLinkRel("https://www.adafruit.com/product/381")).toBe(
      EXTERNAL_SHOP_LINK_REL,
    );
  });
});
