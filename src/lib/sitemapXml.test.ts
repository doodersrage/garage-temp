import { describe, expect, it } from "vitest";
import {
  buildSitemapIndexXml,
  buildSitemapUrlsetXml,
  escapeXml,
  getPublicSitemapPathCount,
} from "./sitemapXml";

describe("sitemapXml", () => {
  it("escapes XML entities", () => {
    expect(escapeXml(`a&b<c>"d"'`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;&apos;");
  });

  it("builds a urlset with about guides", () => {
    const xml = buildSitemapUrlsetXml("https://thermaltrace.dev");
    expect(xml).toContain("<urlset");
    expect(xml).toContain("https://thermaltrace.dev/about/dht22-sensor-overview");
    expect(xml).toContain("https://thermaltrace.dev/docs/api");
    expect(xml).not.toContain("zapier-integration");
    expect(getPublicSitemapPathCount()).toBeGreaterThanOrEqual(100);
  });

  it("builds a sitemap index pointing at sitemap-0", () => {
    const xml = buildSitemapIndexXml("https://thermaltrace.dev/");
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("https://thermaltrace.dev/sitemap-0.xml");
  });
});
