import { describe, expect, it } from "vitest";
import { FALSE_ALARM_TIPS, likelyFalseAlarmFromStale, staleProbeDetail } from "./falseAlarmHints";

describe("falseAlarmHints", () => {
  it("exposes placement and snooze tips", () => {
    expect(FALSE_ALARM_TIPS.some((t) => t.id === "placement")).toBe(true);
    expect(FALSE_ALARM_TIPS.some((t) => t.id === "snooze")).toBe(true);
  });

  it("builds stale probe copy", () => {
    expect(staleProbeDetail(1)).toMatch(/1 probe looks stale/i);
    expect(staleProbeDetail(3)).toMatch(/3 probes look stale/i);
    expect(likelyFalseAlarmFromStale(2)).toBe(true);
    expect(likelyFalseAlarmFromStale(0)).toBe(false);
  });
});
