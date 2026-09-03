import { describe, expect, it } from "vitest";
import {
  FALSE_ALARM_TIPS,
  FLOOD_FALSE_ALARM_TIPS,
  likelyFalseAlarmFromStale,
  staleProbeDetail,
  wetFloodDetail,
} from "./falseAlarmHints";

describe("falseAlarmHints", () => {
  it("exposes freeze and flood tips", () => {
    expect(FALSE_ALARM_TIPS.some((t) => t.id === "placement")).toBe(true);
    expect(FLOOD_FALSE_ALARM_TIPS.some((t) => t.id === "splash")).toBe(true);
    expect(FLOOD_FALSE_ALARM_TIPS.some((t) => t.id === "sump_cycle")).toBe(true);
  });

  it("builds stale and wet probe copy", () => {
    expect(staleProbeDetail(1)).toMatch(/1 probe looks stale/i);
    expect(staleProbeDetail(3)).toMatch(/3 probes look stale/i);
    expect(likelyFalseAlarmFromStale(2)).toBe(true);
    expect(likelyFalseAlarmFromStale(0)).toBe(false);
    expect(wetFloodDetail(1)).toMatch(/wet right now/i);
  });
});
