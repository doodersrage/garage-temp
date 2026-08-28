import { describe, expect, it } from "vitest";
import { coreAboutPages } from "./aboutPages";
import { aboutMegaGroups, featuredAboutSlugs, getFeaturedAboutPages } from "./aboutNavigation";

describe("aboutNavigation", () => {
  it("places every core topic in exactly one mega group", () => {
    const grouped = new Set(aboutMegaGroups.flatMap((group) => group.coreSlugs));
    const coreSlugs = coreAboutPages.map((page) => page.slug);

    expect(grouped.size).toBe(coreSlugs.length);
    for (const slug of coreSlugs) {
      expect(grouped.has(slug)).toBe(true);
    }
  });

  it("resolves featured hub pages from metadata", () => {
    const featured = getFeaturedAboutPages();
    expect(featured).toHaveLength(featuredAboutSlugs.length);
    expect(featured.every((page) => page.slug && page.title)).toBe(true);
  });
});
