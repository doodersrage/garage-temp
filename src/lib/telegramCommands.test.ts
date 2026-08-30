import { describe, expect, it } from "vitest";
import {
  filterRowsByLabel,
  parseTelegramSnoozeHours,
  parseTelegramVacationDays,
  telegramStatusQuery,
} from "./telegramCommands";

describe("telegramCommands", () => {
  it("defaults snooze to 24 hours", () => {
    expect(parseTelegramSnoozeHours("/snooze")).toBe(24);
  });

  it("parses /snooze 4h", () => {
    expect(parseTelegramSnoozeHours("/snooze 4h")).toBe(4);
  });

  it("caps snooze at 168 hours", () => {
    expect(parseTelegramSnoozeHours("/snooze 999")).toBe(168);
  });

  it("parses vacation days", () => {
    expect(parseTelegramVacationDays("/vacation")).toBe(7);
    expect(parseTelegramVacationDays("/vacation 3")).toBe(3);
  });

  it("filters status rows by label", () => {
    const rows = [
      { sensor: { label: "Garage temp" } },
      { sensor: { label: "House humidity" } },
    ];
    expect(telegramStatusQuery("/status garage")).toBe("garage");
    expect(filterRowsByLabel(rows, "garage").map((r) => r.sensor.label)).toEqual([
      "Garage temp",
    ]);
  });
});
