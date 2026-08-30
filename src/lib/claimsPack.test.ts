import { describe, expect, it } from "vitest";
import { buildAlertEventsCsv, type AlertEventRow } from "./alertEvents";
import {
  buildClaimsPackData,
  buildClaimsPackHtml,
  CLAIMS_DISCLAIMER,
  filterCriticalAlertEvents,
} from "./claimsPack";

const sampleEvents: AlertEventRow[] = [
  {
    id: 1,
    user_id: "u1",
    kind: "threshold",
    title: "Freeze alert",
    body: "Garage at 30°F",
    channels_sent: ["email", "sms"],
    channels_skipped: [],
    created_at: "2026-01-15T08:00:00.000Z",
    acknowledged_at: null,
  },
  {
    id: 2,
    user_id: "u1",
    kind: "battery",
    title: "Battery low",
    body: "12%",
    channels_sent: ["email"],
    channels_skipped: ["sms"],
    created_at: "2026-01-15T09:00:00.000Z",
    acknowledged_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: 3,
    user_id: "u1",
    kind: "flood",
    title: "Leak detected",
    body: "Wet",
    channels_sent: ["email"],
    channels_skipped: [],
    created_at: "2026-01-16T02:00:00.000Z",
    acknowledged_at: null,
  },
];

describe("claimsPack", () => {
  it("filters critical alert kinds", () => {
    const critical = filterCriticalAlertEvents(sampleEvents);
    expect(critical.map((e) => e.kind)).toEqual(["threshold", "flood"]);
  });

  it("builds pack data with freeze hours and coldest", () => {
    const pack = buildClaimsPackData({
      householdLabel: "Main garage",
      rangeFrom: "2026-01-14T00:00:00.000Z",
      rangeTo: "2026-01-16T23:59:59.999Z",
      freezeThresholdF: 34,
      points: [
        { timestamp: "2026-01-14T00:00:00Z", tempf: 40, humidity: 50, probeLabel: "Garage" },
        { timestamp: "2026-01-15T00:00:00Z", tempf: 28, humidity: 55, probeLabel: "Garage" },
        { timestamp: "2026-01-16T00:00:00Z", tempf: 30, humidity: 60, probeLabel: "Garage" },
      ],
      events: sampleEvents,
      devices: [
        {
          name: "Bay probe",
          space: "garage",
          sensors: [{ label: "Garage", kind: "temperature" }],
        },
      ],
      readingsCsvUrl: "https://example.com/api/garage-temps/export.csv?from=2026-01-14&to=2026-01-16",
      alertsCsvUrl: "https://example.com/api/alerts/export.csv?from=2026-01-14&to=2026-01-16",
    });

    expect(pack.freezeHours.coldestF).toBe(28);
    expect(pack.freezeHours.hoursBelow34).toBeGreaterThan(0);
    expect(pack.criticalEvents).toHaveLength(2);
    expect(pack.probes[0]?.label).toBe("Garage");
  });

  it("builds printable html with coldest, disclaimer, and csv links", () => {
    const pack = buildClaimsPackData({
      exportedAt: "2026-01-17T12:00:00.000Z",
      householdLabel: "Main garage",
      rangeFrom: "2026-01-14T00:00:00.000Z",
      rangeTo: "2026-01-16T23:59:59.999Z",
      freezeThresholdF: 34,
      points: [
        { timestamp: "2026-01-15T00:00:00Z", tempf: 28.5, humidity: 55, probeLabel: "Garage" },
      ],
      events: sampleEvents,
      devices: [],
      readingsCsvUrl: "https://example.com/readings.csv",
      alertsCsvUrl: "https://example.com/alerts.csv",
    });
    const html = buildClaimsPackHtml(pack);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("28.5°F");
    expect(html).toContain(CLAIMS_DISCLAIMER);
    expect(html).toContain("https://example.com/readings.csv");
    expect(html).toContain("https://example.com/alerts.csv");
    expect(html).toContain("Freeze alert");
    expect(html).toContain("Leak detected");
  });

  it("escapes html in titles and labels", () => {
    const pack = buildClaimsPackData({
      householdLabel: "<script>x</script>",
      rangeFrom: "2026-01-14T00:00:00.000Z",
      rangeTo: "2026-01-16T23:59:59.999Z",
      freezeThresholdF: 34,
      points: [],
      events: [
        {
          ...sampleEvents[0]!,
          title: "<img onerror=alert(1)>",
        },
      ],
      devices: [],
      readingsCsvUrl: "/r.csv",
      alertsCsvUrl: "/a.csv",
    });
    const html = buildClaimsPackHtml(pack);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("alert events csv", () => {
  it("builds csv with headers and escaped fields", () => {
    const csv = buildAlertEventsCsv([
      {
        ...sampleEvents[0]!,
        body: 'Cold, "very"',
      },
    ]);
    expect(csv.startsWith("created_at,kind,title,body,")).toBe(true);
    expect(csv).toContain("threshold");
    expect(csv).toContain('"Cold, ""very"""');
    expect(csv).toContain("email|sms");
  });
});
