import { escapeHtml } from "./htmlEscape";
import type { ClaimsDeviceSummary } from "./claimsPack";
import { CLAIMS_DISCLAIMER } from "./claimsPack";
import type { AlertSettings } from "./alerts";

export type MonitoringCertificateData = {
  exportedAt: string;
  householdLabel: string;
  accountEmail: string | null;
  freezeThresholdF: number;
  devices: ClaimsDeviceSummary[];
  alertChannels: string[];
  alertsEnabled: boolean;
  nwsEnabled: boolean;
  forecastEnabled: boolean;
  dataRetentionDays: number;
  siteUrl: string;
};

export function buildMonitoringCertificateHtml(data: MonitoringCertificateData): string {
  const deviceRows =
    data.devices.length === 0
      ? `<tr><td colspan="3">No devices registered</td></tr>`
      : data.devices
          .map(
            (d) =>
              `<tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.space ?? "—")}</td><td>${d.sensors.length} sensor(s)</td></tr>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ThermalTrace monitoring certificate</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #f4f4f5; }
    .muted { color: #555; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>ThermalTrace monitoring certificate</h1>
  <p class="muted">Generated ${escapeHtml(data.exportedAt)} · ${escapeHtml(data.householdLabel)}</p>
  <p>This certifies that the household below uses ThermalTrace for freeze and leak monitoring with the configuration shown. It is intended for insurers, landlords, or property managers — not as a legal guarantee of coverage.</p>

  <h2>Account</h2>
  <ul>
    <li><strong>Household:</strong> ${escapeHtml(data.householdLabel)}</li>
    <li><strong>Contact:</strong> ${escapeHtml(data.accountEmail ?? "—")}</li>
    <li><strong>Alerts:</strong> ${data.alertsEnabled ? "Enabled" : "Disabled"}</li>
    <li><strong>Freeze threshold:</strong> ${data.freezeThresholdF}°F</li>
    <li><strong>Data retention:</strong> ${data.dataRetentionDays} days</li>
  </ul>

  <h2>Alert channels</h2>
  <p>${data.alertChannels.length ? escapeHtml(data.alertChannels.join(", ")) : "None configured"}</p>
  <ul>
    <li>Forecast cold-risk: ${data.forecastEnabled ? "On" : "Off"}</li>
    <li>Official NWS freeze alerts: ${data.nwsEnabled ? "On" : "Off"}</li>
  </ul>

  <h2>Monitored devices</h2>
  <table>
    <thead><tr><th>Device</th><th>Space</th><th>Sensors</th></tr></thead>
    <tbody>${deviceRows}</tbody>
  </table>

  <p class="muted">${escapeHtml(CLAIMS_DISCLAIMER)}</p>
  <p class="muted">Verify live status: ${escapeHtml(data.siteUrl)}/system-status · Product: ${escapeHtml(data.siteUrl)}</p>
</body>
</html>`;
}
