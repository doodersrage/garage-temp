import { describe, expect, it } from "vitest";
import { getGuideHubCategories } from "./guideHub";
import { getAboutPage } from "./aboutPages";

describe("guideHub", () => {
  it("groups guides into hardware, alerts, sharing, and API", () => {
    const categories = getGuideHubCategories();
    expect(categories.map((category) => category.id)).toEqual([
      "hardware",
      "alerts",
      "sharing",
      "api",
    ]);
    for (const category of categories) {
      expect(category.links.length).toBeGreaterThanOrEqual(3);
      for (const link of category.links) {
        expect(link.href.startsWith("/")).toBe(true);
        expect(link.label.length).toBeGreaterThan(2);
        expect(link.summary.length).toBeGreaterThan(8);
      }
    }
  });

  it("resolves about-guide titles from the catalog", () => {
    const hardware = getGuideHubCategories().find((category) => category.id === "hardware");
    const dht = hardware?.links.find((link) => link.href.includes("dht22"));
    expect(dht?.label).toBe(getAboutPage("dht22-sensor-overview")?.title);
  });
});
