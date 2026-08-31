import { describe, expect, it } from "vitest";

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
