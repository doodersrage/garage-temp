import { describe, expect, it } from "vitest";
import {
  formatQuarterlyWindowLabel,
  shouldSendQuarterlyReport,
} from "./quarterlyReportEmails";

describe("quarterlyReportEmails", () => {
  it("runs on quarter-start mornings UTC", () => {
    expect(shouldSendQuarterlyReport(new Date("2026-04-01T08:00:00Z"))).toBe(true);
    expect(shouldSendQuarterlyReport(new Date("2026-04-01T09:00:00Z"))).toBe(false);
    expect(shouldSendQuarterlyReport(new Date("2026-02-01T08:00:00Z"))).toBe(false);
  });

  it("labels the completed quarter window", () => {
    expect(formatQuarterlyWindowLabel(new Date("2026-01-01T08:00:00Z"))).toBe(
      "Q4 2025 (Oct–Dec)",
    );
    expect(formatQuarterlyWindowLabel(new Date("2026-04-01T08:00:00Z"))).toBe(
      "Q1 2026 (Jan–Mar)",
    );
  });
});
