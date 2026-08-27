import { describe, expect, it } from "vitest";
import { getMemberPriceDisplay, getProPriceDisplay } from "./stripePricing";
import { daysUntil } from "./trialEmails";
import { parseFeedDeviceMeta } from "./tempFeedConfig";
import { shouldSendQuarterlyReport } from "./quarterlyReportEmails";

describe("stripePricing", () => {
  it("formats display prices and annual savings", () => {
    const originalMemberMonthly = import.meta.env.STRIPE_DISPLAY_MEMBER_MONTHLY;
    const originalMemberAnnual = import.meta.env.STRIPE_DISPLAY_MEMBER_ANNUAL;
    (import.meta.env as Record<string, string | undefined>).STRIPE_DISPLAY_MEMBER_MONTHLY = "6";
    (import.meta.env as Record<string, string | undefined>).STRIPE_DISPLAY_MEMBER_ANNUAL = "60";

    const prices = getMemberPriceDisplay();
    expect(prices.monthly).toBe("$6");
    expect(prices.annual).toBe("$60");
    expect(prices.annualSavingsPct).toBe(17);

    (import.meta.env as Record<string, string | undefined>).STRIPE_DISPLAY_MEMBER_MONTHLY =
      originalMemberMonthly;
    (import.meta.env as Record<string, string | undefined>).STRIPE_DISPLAY_MEMBER_ANNUAL =
      originalMemberAnnual;
  });

  it("returns null prices when env is unset", () => {
    const env = import.meta.env as Record<string, string | undefined>;
    const prevM = env.STRIPE_DISPLAY_PRO_MONTHLY;
    const prevA = env.STRIPE_DISPLAY_PRO_ANNUAL;
    env.STRIPE_DISPLAY_PRO_MONTHLY = "";
    env.STRIPE_DISPLAY_PRO_ANNUAL = "";
    expect(getProPriceDisplay().monthly).toBeNull();
    env.STRIPE_DISPLAY_PRO_MONTHLY = prevM;
    env.STRIPE_DISPLAY_PRO_ANNUAL = prevA;
  });
});

describe("trialEmails", () => {
  it("computes days until ISO timestamp", () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntil(inThreeDays)).toBe(3);
    expect(daysUntil(null)).toBeNull();
  });
});

describe("parseFeedDeviceMeta", () => {
  it("extracts battery and rssi from feed root or meta object", () => {
    expect(
      parseFeedDeviceMeta({ battery_pct: 88, rssi: -62, temp: { t1: { f: 40, h: 50 } } }),
    ).toEqual({ battery_pct: 88, rssi: -62 });
    expect(parseFeedDeviceMeta({ meta: { battery_pct: 50 } })).toEqual({ battery_pct: 50 });
  });
});

describe("quarterlyReportEmails", () => {
  it("runs on quarter-start mornings UTC", () => {
    expect(shouldSendQuarterlyReport(new Date("2026-04-01T08:00:00Z"))).toBe(true);
    expect(shouldSendQuarterlyReport(new Date("2026-04-01T09:00:00Z"))).toBe(false);
    expect(shouldSendQuarterlyReport(new Date("2026-02-01T08:00:00Z"))).toBe(false);
  });
});

describe("parseCheckoutDetail", () => {
  it("parses plan, interval, and nudge source", async () => {
    const { parseCheckoutDetail } = await import("./checkoutAnalytics");
    expect(parseCheckoutDetail("pro/monthly via nudge_sms_alerts")).toEqual({
      plan: "pro",
      interval: "monthly",
      source: "nudge_sms_alerts",
    });
    expect(parseCheckoutDetail("member/annual")).toEqual({
      plan: "member",
      interval: "annual",
      source: null,
    });
  });
});
