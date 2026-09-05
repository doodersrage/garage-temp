import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARTICLE_MODIFIED,
  DEFAULT_ARTICLE_PUBLISHED,
  getArticleSchema,
  getBrandDefinition,
  getWebSiteSchema,
} from "./schemaMarkup";

describe("schemaMarkup", () => {
  it("advertises a SearchAction that targets /about?q=", () => {
    const schema = getWebSiteSchema("https://thermaltrace.dev");
    const action = schema.potentialAction as {
      "@type": string;
      target: { urlTemplate: string };
    };
    expect(action["@type"]).toBe("SearchAction");
    expect(action.target.urlTemplate).toBe(
      "https://thermaltrace.dev/about?q={search_term_string}",
    );
  });

  it("uses stable Article dates by default", () => {
    const article = getArticleSchema({
      siteUrl: "https://thermaltrace.dev",
      pageUrl: "https://thermaltrace.dev/about/esp32-freeze-kit",
      headline: "ESP32 freeze kit",
      description: "Parts list",
    });
    expect(article.datePublished).toBe(DEFAULT_ARTICLE_PUBLISHED);
    expect(article.dateModified).toBe(DEFAULT_ARTICLE_MODIFIED);
  });

  it("exports a brand definition for AEO", () => {
    expect(getBrandDefinition()).toMatch(/ThermalTrace/i);
    expect(getBrandDefinition().length).toBeGreaterThan(40);
  });
});
