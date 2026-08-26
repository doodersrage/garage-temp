import { describe, expect, it } from "vitest";
import {
  getNudgeContent,
  nextUpgradeTier,
  normalizeComparisonTier,
  tierRank,
} from "./planComparison";

describe("planComparison", () => {
  it("returns csv nudge for free tier only", () => {
    expect(getNudgeContent("free", "csv_export")?.targetTier).toBe("member");
    expect(getNudgeContent("member", "csv_export")).toBeNull();
  });

  it("returns pro nudge for member tier", () => {
    expect(getNudgeContent("member", "sms_alerts")?.targetTier).toBe("pro");
    expect(getNudgeContent("pro", "sms_alerts")).toBeNull();
  });

  it("suggests next upgrade tier", () => {
    expect(nextUpgradeTier("free")).toBe("member");
    expect(nextUpgradeTier("member")).toBe("pro");
    expect(nextUpgradeTier("pro")).toBeNull();
  });

  it("ranks tiers", () => {
    expect(tierRank("free")).toBeLessThan(tierRank("member"));
    expect(normalizeComparisonTier("admin")).toBe("pro");
  });
});
