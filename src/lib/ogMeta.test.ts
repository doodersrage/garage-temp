import { describe, expect, it } from "vitest";
import {
  absoluteOgImageUrl,
  resolveOgImageAlt,
  resolveOgImagePath,
} from "./ogMeta";

describe("ogMeta", () => {
  it("maps public paths to dedicated share images", () => {
    expect(resolveOgImagePath("/")).toBe("/og-dashboard.jpg");
    expect(resolveOgImagePath("/pricing")).toBe("/og-pricing.jpg");
    expect(resolveOgImagePath("/compare")).toBe("/og-pricing.jpg");
    expect(resolveOgImagePath("/freeze-map")).toBe("/og-freeze-map.jpg");
    expect(resolveOgImagePath("/about")).toBe("/og-about.jpg");
    expect(resolveOgImagePath("/about/ingest-and-webhooks")).toBe("/og-about.jpg");
    expect(resolveOgImagePath("/guides")).toBe("/og-about.jpg");
    expect(resolveOgImagePath("/stories/garage-freeze-alert")).toBe(
      "/og-story-freeze.jpg",
    );
    expect(resolveOgImagePath("/docs/api")).toBe("/og-api.jpg");
    expect(resolveOgImagePath("/android")).toBe("/og-android.jpg");
    expect(resolveOgImagePath("/accessories")).toBe("/og-about.jpg");
    expect(resolveOgImagePath("/claim-puck")).toBe("/og-about.jpg");
    expect(resolveOgImagePath("/probe-mount-kit")).toBe("/og-about.jpg");
    expect(resolveOgImagePath("/integrations/home-assistant")).toBe(
      "/og-dashboard.jpg",
    );
    expect(resolveOgImagePath("/gift")).toBe("/og-dashboard.jpg");
    expect(resolveOgImagePath("/claims-pack")).toBe("/og-dashboard.jpg");
  });

  it("builds absolute image URLs", () => {
    expect(absoluteOgImageUrl("https://thermaltrace.dev", "/og-api.jpg")).toBe(
      "https://thermaltrace.dev/og-api.jpg",
    );
    expect(
      absoluteOgImageUrl("https://thermaltrace.dev", "https://cdn.example/x.jpg"),
    ).toBe("https://cdn.example/x.jpg");
  });

  it("returns descriptive alts", () => {
    expect(resolveOgImageAlt("/freeze-map")).toMatch(/freeze-risk map/i);
    expect(resolveOgImageAlt("/")).toMatch(/humidity/i);
    expect(resolveOgImageAlt("/demo")).toMatch(/probe temperature curves/i);
    expect(resolveOgImageAlt("/guides")).toMatch(/guides for probes/i);
    expect(resolveOgImageAlt("/claim-puck")).toMatch(/accessories/i);
  });
});
