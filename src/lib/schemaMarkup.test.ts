import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARTICLE_MODIFIED,
  DEFAULT_ARTICLE_PUBLISHED,
  getArticleSchema,
  getBrandDefinition,
  getHowToSchema,
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

  it("builds HowTo schema with ordered steps", () => {
    const howTo = getHowToSchema({
      name: "Build a freeze probe",
      description: "ESP32 + DS18B20",
      pageUrl: "https://thermaltrace.dev/about/esp32-freeze-kit",
      steps: [
        { name: "Buy parts", text: "ESP32 and DS18B20" },
        {
          name: "Wire",
          text: "GPIO 4 with 4.7k pull-up",
          url: "https://thermaltrace.dev/about/esp32-freeze-kit",
        },
      ],
    });
    expect(howTo?.["@type"]).toBe("HowTo");
    expect(howTo?.step).toHaveLength(2);
  });

  it("exports a brand definition for AEO", () => {
    expect(getBrandDefinition()).toMatch(/ThermalTrace/i);
    expect(getBrandDefinition().length).toBeGreaterThan(40);
  });
});
