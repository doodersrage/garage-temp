import { describe, expect, it } from "vitest";
import { formatAlertChannelList, formatAlertChannelsCsv } from "./alertChannelLabels";

describe("alertChannelLabels", () => {
  it("maps skip reason codes to readable labels", () => {
    expect(formatAlertChannelList(["email", "push_no_subscription"])).toBe(
      "email, push (subscribe this browser first)",
    );
  });

  it("parses comma-separated channel csv", () => {
    expect(formatAlertChannelsCsv("sms,quiet_hours")).toBe("SMS, quiet hours");
  });
});
