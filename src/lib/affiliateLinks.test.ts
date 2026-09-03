import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  affiliateHref,
  COMMERCE_LINK_REL,
  withAdafruitRef,
  withAmazonTag,
} from "./affiliateLinks";

describe("affiliateLinks", () => {
  const env = import.meta.env as Record<string, string | undefined>;
  let prevAmazon: string | undefined;
  let prevAdafruit: string | undefined;

  beforeEach(() => {
    prevAmazon = env.PUBLIC_AMAZON_ASSOCIATE_TAG;
    prevAdafruit = env.PUBLIC_ADAFRUIT_AFFILIATE_ID;
  });

  afterEach(() => {
    if (prevAmazon == null) delete env.PUBLIC_AMAZON_ASSOCIATE_TAG;
    else env.PUBLIC_AMAZON_ASSOCIATE_TAG = prevAmazon;
    if (prevAdafruit == null) delete env.PUBLIC_ADAFRUIT_AFFILIATE_ID;
    else env.PUBLIC_ADAFRUIT_AFFILIATE_ID = prevAdafruit;
    vi.unstubAllGlobals();
  });

  it("exports sponsored commerce rel", () => {
    expect(COMMERCE_LINK_REL).toContain("sponsored");
    expect(COMMERCE_LINK_REL).toContain("noopener");
  });

  it("leaves URLs unchanged without tags", () => {
    delete env.PUBLIC_AMAZON_ASSOCIATE_TAG;
    delete env.PUBLIC_ADAFRUIT_AFFILIATE_ID;
    expect(withAmazonTag("https://www.amazon.com/s?k=ESP32")).toBe(
      "https://www.amazon.com/s?k=ESP32",
    );
    expect(withAdafruitRef("https://www.adafruit.com/product/381")).toBe(
      "https://www.adafruit.com/product/381",
    );
  });

  it("appends Amazon Associates tag", () => {
    expect(withAmazonTag("https://www.amazon.com/s?k=ESP32", "thermaltrace-20")).toBe(
      "https://www.amazon.com/s?k=ESP32&tag=thermaltrace-20",
    );
  });

  it("appends Adafruit ada_ref", () => {
    expect(withAdafruitRef("https://www.adafruit.com/product/381", "tt-kit")).toBe(
      "https://www.adafruit.com/product/381?ada_ref=tt-kit",
    );
  });

  it("ignores tags on unrelated hosts", () => {
    expect(withAmazonTag("https://example.com/x", "tag-20")).toBe("https://example.com/x");
    expect(withAdafruitRef("https://example.com/x", "ref")).toBe("https://example.com/x");
  });

  it("routes affiliateHref by host", () => {
    expect(affiliateHref("https://www.amazon.com/s?k=x")).toContain("amazon.com");
    expect(affiliateHref("https://www.adafruit.com/product/1")).toContain("adafruit.com");
  });
});
