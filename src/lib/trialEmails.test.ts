import { describe, expect, it } from "vitest";
import { daysUntil } from "./trialEmails";

describe("trialEmails", () => {
  it("computes days until ISO timestamp", () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntil(inThreeDays)).toBe(3);
    expect(daysUntil(null)).toBeNull();
  });
});
