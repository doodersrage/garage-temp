import { describe, expect, it } from "vitest";
import { buildFreezeOutlookIcal } from "./icalFeed";

describe("ical feed", () => {
  it("includes at-risk nights", () => {
    const ical = buildFreezeOutlookIcal([
      { dateLabel: "Mon", minTempF: 28, atRisk: true },
      { dateLabel: "Tue", minTempF: 40, atRisk: false },
    ]);
    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("28");
  });
});
