import { describe, expect, it } from "vitest";
import {
  channelTestErrorMessage,
  formatAlertChannelList,
  formatAlertChannelsCsv,
} from "./alertChannelLabels";

describe("alertChannelLabels", () => {
  it("maps skip reason codes to readable labels", () => {
    expect(formatAlertChannelList(["email", "push_no_subscription"])).toBe(
      "email, push (subscribe this browser first)",
    );
  });

  it("parses comma-separated channel csv", () => {
    expect(formatAlertChannelsCsv("sms,quiet_hours")).toBe("SMS, quiet hours");
  });

  it("formats ops channel-test errors", () => {
    expect(channelTestErrorMessage("push_no_subscription")).toBe(
      "push (subscribe this browser first)",
    );
    expect(channelTestErrorMessage("sms_no_phone")).toMatch(/phone/i);
    expect(channelTestErrorMessage(null)).toBeNull();
  });
});
