import { describe, expect, it } from "vitest";
import {
  CRON_FULL_HOURLY,
  CRON_POLL_QUARTERS,
  isFullHourlyCronRun,
} from "./cronSchedule";

describe("cronSchedule", () => {
  it("treats only the top-of-hour expression as full maintenance", () => {
    expect(isFullHourlyCronRun(CRON_FULL_HOURLY)).toBe(true);
    expect(isFullHourlyCronRun(CRON_POLL_QUARTERS)).toBe(false);
  });
});
