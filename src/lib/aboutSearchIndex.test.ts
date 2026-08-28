import { describe, expect, it } from "vitest";
import { buildAboutSearchIndex } from "./aboutSearchIndex";

describe("buildAboutSearchIndex", () => {
  it("keeps only search fields", () => {
    const index = buildAboutSearchIndex([
      {
        slug: "dht22-sensor-overview",
        title: "DHT22 overview",
        description: "Full description",
        summary: "Short summary",
        parentSlug: "arduino-sketches",
      },
    ]);

    expect(index).toEqual([
      {
        slug: "dht22-sensor-overview",
        title: "DHT22 overview",
        description: "Full description",
        summary: "Short summary",
      },
    ]);
  });
});
