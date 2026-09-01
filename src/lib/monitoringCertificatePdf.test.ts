import { describe, expect, it } from "vitest";
import {
  resolveMonitoringRetentionLabel,
  buildMonitoringCertificateHtml,
} from "./monitoringCertificate";
import { buildMonitoringCertificatePdf } from "./monitoringCertificatePdf";
import type { MonitoringCertificateData } from "./monitoringCertificate";

const sample: MonitoringCertificateData = {
  exportedAt: "2026-09-01T12:00:00.000Z",
  exportedAtLabel: "Sep 1, 2026, 12:00 PM",
  householdLabel: "Garage property",
  accountEmail: "owner@example.com",
  planLabel: "Pro",
  freezeThresholdF: 34,
  devices: [
    {
      name: "Garage ESP",
      space: "garage",
      sensors: [{ label: "Temp", kind: "temperature" }],
    },
  ],
  deviceCount: 1,
  sensorCount: 1,
  alertChannels: ["email", "SMS"],
  alertsEnabled: true,
  nwsEnabled: true,
  forecastEnabled: false,
  dataRetentionLabel: "1 year (plan default)",
  siteUrl: "https://thermaltrace.dev",
};

describe("resolveMonitoringRetentionLabel", () => {
  it("uses plan default when custom retention is unset", () => {
    expect(resolveMonitoringRetentionLabel(null, 365)).toBe("1 year (plan default)");
  });

  it("uses custom retention when set", () => {
    expect(resolveMonitoringRetentionLabel(180, 365)).toBe("180 days");
  });
});

describe("buildMonitoringCertificateHtml", () => {
  it("does not render null retention", () => {
    const html = buildMonitoringCertificateHtml(sample);
    expect(html).toContain("1 year (plan default)");
    expect(html).not.toContain("null");
  });
});

describe("buildMonitoringCertificatePdf", () => {
  it("returns a PDF document", async () => {
    const bytes = await buildMonitoringCertificatePdf(sample);
    expect(bytes.length).toBeGreaterThan(500);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });
});
