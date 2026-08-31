import { describe, expect, it } from "vitest";
import { filterChannelsForSpace } from "./spaceChannelRouting";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";

describe("space channel routing", () => {
  it("restricts channels for a space", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      spaceChannelRouting: {
        garage: { threshold: ["telegram" as const] },
      },
    };
    const filtered = filterChannelsForSpace(
      settings,
      "garage",
      "threshold",
      ["email", "telegram", "sms"],
    );
    expect(filtered).toEqual(["telegram"]);
  });
});
