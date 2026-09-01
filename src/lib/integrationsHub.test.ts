import { describe, expect, it } from "vitest";
import { HACS_REPO_URL, INTEGRATION_CARDS } from "./integrationsHub";

describe("integrationsHub", () => {
  it("re-exports HACS repo URL for integration pages", () => {
    expect(HACS_REPO_URL).toContain("thermaltrace-home-assistant");
  });

  it("includes Home Assistant as first integration card", () => {
    expect(INTEGRATION_CARDS[0]?.id).toBe("home-assistant");
  });
});
