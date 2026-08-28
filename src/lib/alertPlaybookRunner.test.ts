import { describe, expect, it } from "vitest";
import { parseAlertPlaybooks } from "./alertPlaybooks";

describe("alertPlaybooks", () => {
  it("parses valid steps", () => {
    const steps = parseAlertPlaybooks([
      {
        id: "sms-15",
        name: "SMS escalation",
        afterMinutes: 15,
        ifUnacked: true,
        channels: ["sms"],
        kinds: ["threshold"],
      },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.afterMinutes).toBe(15);
    expect(steps[0]?.channels).toEqual(["sms"]);
  });
});
