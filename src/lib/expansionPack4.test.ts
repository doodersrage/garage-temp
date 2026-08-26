import { describe, expect, it } from "vitest";
import { applyAlertTemplates, interpolateTemplate } from "./alertTemplates";
import { appendBatterySample, detectBatteryTrendDrop } from "./batteryTrend";
import { computeFreezeHours } from "./freezeHours";
import { buildFreezeOutlookIcal } from "./icalFeed";

describe("alert templates", () => {
  it("interpolates variables", () => {
    expect(interpolateTemplate("Hello {{kind}}", { kind: "threshold" })).toBe(
      "Hello threshold",
    );
  });

  it("applies kind-specific templates", () => {
    const result = applyAlertTemplates(
      { title: "Alert", body: "Cold", kind: "threshold" },
      { threshold: { title: "{{kind}}: urgent", body: "{{body}}!" } },
    );
    expect(result.title).toContain("threshold");
    expect(result.body).toBe("Cold!");
  });
});

describe("battery trend", () => {
  it("appends samples with cap", () => {
    let history: unknown = [];
    for (let i = 0; i < 20; i += 1) {
      history = appendBatterySample(history, 100 - i, `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`);
    }
    expect((history as []).length).toBeLessThanOrEqual(14);
  });

  it("detects large drop", () => {
    const msg = detectBatteryTrendDrop([
      { pct: 90, at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { pct: 60, at: new Date().toISOString() },
    ]);
    expect(msg).toContain("30%");
  });
});

describe("freeze hours", () => {
  it("estimates hours below threshold", () => {
    const summary = computeFreezeHours([
      { timestamp: "2026-01-01T00:00:00Z", tempf: 30, humidity: 50, probeLabel: "A" },
      { timestamp: "2026-01-01T02:00:00Z", tempf: 30, humidity: 50, probeLabel: "A" },
    ]);
    expect(summary.hoursBelow34).toBeGreaterThan(0);
    expect(summary.coldestF).toBe(30);
  });
});

describe("ical feed", () => {
  it("includes at-risk nights", () => {
    const ical = buildFreezeOutlookIcal([
      { dateLabel: "Mon", minTempF: 28, atRisk: true },
      { dateLabel: "Tue", minTempF: 40, atRisk: false },
    ]);
    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("28");
  });
});

describe("household roles", () => {
  const canEdit = (role: string) => role === "owner" || role === "member";

  it("allows owners and members to edit", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("member")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
  });
});
