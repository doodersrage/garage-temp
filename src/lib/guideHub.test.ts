import { describe, expect, it } from "vitest";
import { getGuideHubCategories } from "./guideHub";
import { getAboutPage } from "./aboutPages";

describe("guideHub", () => {
  it("groups guides into hardware, alerts, sharing, integrations, and API", () => {
    const categories = getGuideHubCategories();
    expect(categories.map((category) => category.id)).toEqual([
      "hardware",
      "alerts",
      "sharing",
      "integrations",
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

  it("lists each guide href in only one category (cross-refs use alsoIn)", () => {
    const seen = new Map<string, string>();
    for (const category of getGuideHubCategories()) {
      for (const link of category.links) {
        const key = link.href.split("#")[0]!;
        expect(seen.has(key), `duplicate hub listing for ${key}`).toBe(false);
        seen.set(key, category.id);
      }
    }
  });

  it("points MQTT bridge at its dedicated guide", () => {
    const integrations = getGuideHubCategories().find((c) => c.id === "integrations");
    const mqtt = integrations?.links.find((l) => l.href.includes("mqtt-bridge"));
    expect(mqtt?.href).toBe("/about/mqtt-bridge");
    expect(getAboutPage("mqtt-bridge")?.title).toMatch(/MQTT/i);
  });
});
