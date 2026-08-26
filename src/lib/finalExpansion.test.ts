import { describe, expect, it } from "vitest";
import { applyAlertTemplates } from "./alertTemplates";

function referralBonusTrialDays(referredBy: string | null | undefined): number {
  return referredBy ? 7 : 0;
}

const PRO_TRIAL_DAYS = 14;

describe("referrals", () => {
  it("adds bonus trial days for referred users", () => {
    expect(referralBonusTrialDays("abc123")).toBe(7);
    expect(referralBonusTrialDays(null)).toBe(0);
    expect(PRO_TRIAL_DAYS + referralBonusTrialDays("x")).toBe(21);
  });
});

describe("alert template kinds", () => {
  it("applies battery kind template", () => {
    const result = applyAlertTemplates(
      { title: "Battery", body: "Low", kind: "battery" },
      { battery: { title: "{{kind}} alert", body: "{{body}}!" } },
    );
    expect(result.title).toBe("battery alert");
    expect(result.body).toBe("Low!");
  });
});
