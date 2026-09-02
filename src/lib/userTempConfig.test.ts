import { describe, expect, it } from "vitest";
import { normalizePullFeedUrl } from "./tempFeedConfig";

describe("normalizePullFeedUrl", () => {
  it("trims and strips trailing slashes", () => {
    expect(normalizePullFeedUrl(" https://garage.example/ ")).toBe(
      "https://garage.example",
    );
    expect(normalizePullFeedUrl("https://garage.example///")).toBe(
      "https://garage.example",
    );
  });

  it("keeps bare origin without inventing a path", () => {
    expect(normalizePullFeedUrl("https://garage.example")).toBe(
      "https://garage.example",
    );
  });
});
