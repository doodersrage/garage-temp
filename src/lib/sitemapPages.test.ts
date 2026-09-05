import { describe, expect, it } from "vitest";
import { buildPublicSitemapUrls, getPublicSitemapPaths } from "./sitemapPages";

describe("sitemapPages", () => {
  it("includes expanded about guides served by [slug].astro", () => {
    const paths = getPublicSitemapPaths();
    expect(paths).toContain("/about/dht22-sensor-overview");
    expect(paths).toContain("/about/temperature-probes");
    expect(paths).toContain("/guides");
    expect(paths).toContain("/docs/api");
    expect(paths).toContain("/android");
    expect(paths).toContain("/bay-buddy");
    expect(paths).toContain("/claim-puck");
    expect(paths).toContain("/accessories");
    expect(paths).toContain("/alert-beacon");
    expect(paths).toContain("/leak-puck");
    expect(paths).toContain("/privacy");
    expect(paths).toContain("/terms");
  });

  it("excludes redirect-only and non-public routes", () => {
    const paths = getPublicSitemapPaths();
    expect(paths).not.toContain("/about/zapier-integration");
    expect(paths).not.toContain("/dashboard/alerts");
    expect(paths).not.toContain("/signin");
    expect(paths).not.toContain("/embed/freeze-map");
  });

  it("includes traffic pages", () => {
    const paths = getPublicSitemapPaths();
    expect(paths).toContain("/freeze-season");
    expect(paths).toContain("/demo");
    expect(paths).toContain("/share-kit");
    expect(paths).toContain("/stories");
    expect(paths).toContain("/compare/diy-mqtt");
    expect(paths).toContain("/gift");
  });

  it("builds absolute URLs from site origin", () => {
    const urls = buildPublicSitemapUrls("https://thermaltrace.dev");
    expect(urls).toContain("https://thermaltrace.dev/about/dht22-sensor-overview");
    expect(urls.every((url) => url.startsWith("https://thermaltrace.dev/"))).toBe(true);
  });
});
