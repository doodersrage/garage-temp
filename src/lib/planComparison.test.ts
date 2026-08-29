import { describe, expect, it } from "vitest";
import {
  getNudgeContent,
  nextUpgradeTier,
  normalizeComparisonTier,
  PLAN_FEATURE_ROWS,
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

  it("lists device counts and retention side-by-side", () => {
    const devices = PLAN_FEATURE_ROWS.find((row) => row.id === "push_devices");
    const retention = PLAN_FEATURE_ROWS.find((row) => row.id === "data_retention");
    expect(devices).toMatchObject({
      free: "2 devices",
      member: "6 devices",
      pro: "24 devices",
    });
    expect(retention).toMatchObject({
      free: "7 days",
      member: "90 days",
      pro: "1 year+",
    });
  });

  it("badges cold-risk forecasts on Member and Pro", () => {
    const coldRisk = PLAN_FEATURE_ROWS.find((row) => row.id === "cold_risk");
    expect(coldRisk?.free).toBe("Threshold only");
    expect(coldRisk?.member).toBe("Forecast freeze");
    expect(coldRisk?.pro).toBe("Forecast + NWS");
    expect(coldRisk?.cellBadge?.member).toBe("Cold-risk");
    expect(coldRisk?.cellBadge?.pro).toBe("Cold-risk");
    expect(coldRisk?.cellBadge?.free).toBeUndefined();
  });

  it("nudges free users toward retention and cold-risk", () => {
    expect(getNudgeContent("free", "data_retention")?.targetTier).toBe("member");
    expect(getNudgeContent("free", "cold_risk")?.targetTier).toBe("member");
    expect(getNudgeContent("member", "data_retention")).toBeNull();
  });
});
