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

  it("suggests next upgrade tier including portfolio", () => {
    expect(nextUpgradeTier("free")).toBe("member");
    expect(nextUpgradeTier("member")).toBe("pro");
    expect(nextUpgradeTier("pro")).toBe("portfolio");
    expect(nextUpgradeTier("portfolio")).toBeNull();
  });

  it("ranks tiers", () => {
    expect(tierRank("free")).toBeLessThan(tierRank("member"));
    expect(normalizeComparisonTier("admin")).toBe("portfolio");
  });

  it("treats portfolio as a distinct comparison column above pro", () => {
    expect(tierRank("pro")).toBeLessThan(tierRank("portfolio"));
    expect(tierRank("portfolio")).toBeLessThan(tierRank("admin"));
    expect(normalizeComparisonTier("portfolio")).toBe("portfolio");
    expect(normalizeComparisonTier("pro")).toBe("pro");
    expect(nextUpgradeTier("portfolio")).toBeNull();
  });

  it("lists device counts and retention side-by-side", () => {
    const devices = PLAN_FEATURE_ROWS.find((row) => row.id === "push_devices");
    const retention = PLAN_FEATURE_ROWS.find((row) => row.id === "data_retention");
    const pullFeeds = PLAN_FEATURE_ROWS.find((row) => row.id === "pull_feeds");
    expect(devices).toMatchObject({
      free: "2 devices",
      member: "6 devices",
      pro: "24 devices",
      portfolio: "24 devices",
    });
    expect(retention).toMatchObject({
      free: "7 days",
      member: "90 days",
      pro: "1 year+",
      portfolio: "1 year+",
    });
    expect(pullFeeds?.category).toBe("Limits");
    const kinds = PLAN_FEATURE_ROWS.find((row) => row.id === "sensor_kinds");
    expect(kinds?.free).toMatch(/air quality/i);
    expect(kinds?.member).toBe(kinds?.free);
    expect(kinds?.pro).toBe(kinds?.free);
    expect(kinds?.portfolio).toBe(kinds?.free);
  });

  it("uses complete cold-risk phrases instead of badge fragments", () => {
    const coldRisk = PLAN_FEATURE_ROWS.find((row) => row.id === "cold_risk");
    expect(coldRisk?.label).toBe("Cold-risk alerts");
    expect(coldRisk?.free).toBe("Threshold only");
    expect(coldRisk?.member).toBe("Forecast-based cold-risk");
    expect(coldRisk?.pro).toBe("Forecast + official NWS");
    expect(coldRisk?.portfolio).toBe("Forecast + official NWS");
    expect(coldRisk?.cellBadge).toBeUndefined();
  });

  it("nudges free users toward retention and cold-risk", () => {
    expect(getNudgeContent("free", "data_retention")?.targetTier).toBe("member");
    expect(getNudgeContent("free", "cold_risk")?.targetTier).toBe("member");
    expect(getNudgeContent("member", "data_retention")).toBeNull();
  });

  it("lists claims pack as Pro-and-above", () => {
    const claims = PLAN_FEATURE_ROWS.find((row) => row.id === "claims_pack");
    expect(claims).toMatchObject({
      free: "—",
      member: "—",
      pro: "Printable HTML + CSVs",
      portfolio: "Printable HTML + CSVs",
    });
    expect(getNudgeContent("member", "claims_pack")?.targetTier).toBe("pro");
    expect(getNudgeContent("pro", "claims_pack")).toBeNull();
    expect(getNudgeContent("member", "claims_pack")?.compareHref).toBe("/claims-pack");
  });

  it("differentiates property ceiling and property-manager on Portfolio", () => {
    const multi = PLAN_FEATURE_ROWS.find((row) => row.id === "multi_property");
    const managers = PLAN_FEATURE_ROWS.find((row) => row.id === "property_manager");
    expect(multi).toMatchObject({
      free: "1",
      member: "1",
      pro: "Up to 50",
      portfolio: "Up to 500",
    });
    expect(managers?.portfolio).toMatch(/devices & alerts/i);
    expect(managers?.pro).toBe("—");
    expect(getNudgeContent("pro", "portfolio_scale")?.targetTier).toBe("portfolio");
    expect(getNudgeContent("portfolio", "portfolio_scale")).toBeNull();
  });
});
