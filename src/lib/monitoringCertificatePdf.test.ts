import { describe, expect, it } from "vitest";
import { buildMonitoringCertificatePdf } from "./monitoringCertificatePdf";
import type { MonitoringCertificateData } from "./monitoringCertificate";

const sample: MonitoringCertificateData = {
  exportedAt: "2026-09-01T12:00:00.000Z",
  householdLabel: "Garage property",
  accountEmail: "owner@example.com",
  freezeThresholdF: 34,
  devices: [
    {
      name: "Garage ESP",
      space: "garage",
      sensors: [{ label: "Temp", kind: "temperature" }],
    },
  ],
  alertChannels: ["email", "SMS"],
  alertsEnabled: true,
  nwsEnabled: true,
  forecastEnabled: false,
  dataRetentionDays: 365,
  siteUrl: "https://thermaltrace.dev",
};

describe("buildMonitoringCertificatePdf", () => {
  it("returns a PDF document", async () => {
    const bytes = await buildMonitoringCertificatePdf(sample);
    expect(bytes.length).toBeGreaterThan(500);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });
});
