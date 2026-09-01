import { escapeHtml } from "./htmlEscape";
import type { ClaimsDeviceSummary } from "./claimsPack";
import { CLAIMS_DISCLAIMER } from "./claimsPack";
import { formatHistoryRetention } from "./entitlements";
import type { PlanTier } from "./entitlements";

export type MonitoringCertificateData = {
  exportedAt: string;
  exportedAtLabel: string;
  householdLabel: string;
  accountEmail: string | null;
  planLabel: string;
  freezeThresholdF: number;
  devices: ClaimsDeviceSummary[];
  deviceCount: number;
  sensorCount: number;
  alertChannels: string[];
  alertsEnabled: boolean;
  nwsEnabled: boolean;
  forecastEnabled: boolean;
  dataRetentionLabel: string;
  siteUrl: string;
};

export function formatCertificateDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function formatPlanLabel(tier: PlanTier): string {
  if (tier === "admin") return "Admin";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function resolveMonitoringRetentionLabel(
  customDays: number | null | undefined,
  planDays: number,
): string {
  if (typeof customDays === "number" && Number.isFinite(customDays) && customDays >= 30) {
    return formatHistoryRetention(customDays);
  }
  return `${formatHistoryRetention(planDays)} (plan default)`;
}

function statBlock(label: string, value: string, detail?: string): string {
  return `<article class="stat">
    <p class="stat-label">${escapeHtml(label)}</p>
    <p class="stat-value">${escapeHtml(value)}</p>
    ${detail ? `<p class="stat-detail">${escapeHtml(detail)}</p>` : ""}
  </article>`;
}

function statusPill(on: boolean, label: string): string {
  return `<span class="pill ${on ? "pill-on" : "pill-off"}">${escapeHtml(label)}: ${on ? "On" : "Off"}</span>`;
}

export function buildMonitoringCertificateHtml(data: MonitoringCertificateData): string {
  const deviceRows =
    data.devices.length === 0
      ? `<tr><td colspan="3">No devices registered</td></tr>`
      : data.devices
          .map((d) => {
            const sensorList =
              d.sensors.length > 0
                ? d.sensors.map((s) => `${s.label} (${s.kind})`).join(", ")
                : "—";
            return `<tr>
              <td>${escapeHtml(d.name)}</td>
              <td>${escapeHtml(d.space ?? "—")}</td>
              <td>${escapeHtml(sensorList)}</td>
            </tr>`;
          })
          .join("");

  const channelList =
    data.alertChannels.length > 0
      ? data.alertChannels.map((c) => `<span class="channel">${escapeHtml(c)}</span>`).join("")
      : `<span class="muted-inline">None configured</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ThermalTrace monitoring certificate — ${escapeHtml(data.householdLabel)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px 24px;
      background: #fafafa;
      color: #111827;
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.5;
      font-size: 14px;
    }
    .wrap { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(17, 24, 39, 0.06); }
    .hero {
      padding: 28px 28px 24px;
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fff 100%);
      border-bottom: 3px solid #ea580c;
    }
    .brand { font-family: system-ui, sans-serif; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px; font-size: 13px; }
    .brand span.accent { color: #c2410c; }
    .cert-badge {
      display: inline-block;
      font-family: system-ui, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #9a3412;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid #fdba74;
      border-radius: 999px;
      padding: 4px 10px;
      margin-bottom: 10px;
    }
    h1 { font-size: 26px; margin: 0 0 8px; font-weight: 700; line-height: 1.2; }
    .lead { font-family: system-ui, sans-serif; font-size: 14px; color: #374151; margin: 0 0 8px; max-width: 52em; }
    .meta { font-family: system-ui, sans-serif; font-size: 12px; color: #6b7280; margin: 0; }
    .body { padding: 24px 28px 28px; }
    h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; font-family: system-ui, sans-serif; }
    h2:first-child { margin-top: 0; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 4px 0 8px; }
    .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
    .stat-label { font-family: system-ui, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0; }
    .stat-value { font-family: system-ui, sans-serif; font-size: 18px; font-weight: 600; margin: 4px 0 0; color: #111827; }
    .stat-detail { font-family: system-ui, sans-serif; font-size: 11px; color: #6b7280; margin: 2px 0 0; }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 4px; font-family: system-ui, sans-serif; font-size: 12px; }
    .pill { border-radius: 999px; padding: 4px 10px; border: 1px solid #d1d5db; }
    .pill-on { background: #ecfdf5; border-color: #6ee7b7; color: #047857; }
    .pill-off { background: #f9fafb; color: #6b7280; }
    .channels { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; font-family: system-ui, sans-serif; }
    .channel { font-size: 12px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: 6px; padding: 3px 8px; }
    .muted-inline { font-family: system-ui, sans-serif; font-size: 13px; color: #6b7280; }
    .account-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 20px; font-family: system-ui, sans-serif; font-size: 13px; margin: 8px 0 0; }
    .account-grid dt { color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .account-grid dd { margin: 2px 0 12px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-family: system-ui, sans-serif; font-size: 13px; }
    th, td { text-align: left; padding: 8px 10px; border-top: 1px solid #e5e7eb; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: #4b5563; border-top: none; }
    .disclaimer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #4b5563; }
    .footer-links { font-family: system-ui, sans-serif; font-size: 11px; color: #6b7280; margin-top: 8px; }
    .footer-links a { color: #c2410c; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <p class="brand">Thermal<span class="accent">Trace</span></p>
      <p class="cert-badge">Monitoring certificate</p>
      <h1>${escapeHtml(data.householdLabel)}</h1>
      <p class="lead">
        This certifies active freeze and leak monitoring configuration for the household below.
        Intended for insurers, landlords, and property managers — not a legal guarantee of coverage.
      </p>
      <p class="meta">Exported ${escapeHtml(data.exportedAtLabel)} UTC · ${escapeHtml(data.planLabel)} plan</p>
    </header>

    <div class="body">
      <section>
        <h2>Monitoring summary</h2>
        <div class="stats">
          ${statBlock("Alerts", data.alertsEnabled ? "Enabled" : "Disabled")}
          ${statBlock("Freeze threshold", `${data.freezeThresholdF}°F`)}
          ${statBlock("Data retention", data.dataRetentionLabel)}
          ${statBlock("Coverage", `${data.deviceCount} device${data.deviceCount === 1 ? "" : "s"}`, `${data.sensorCount} sensor${data.sensorCount === 1 ? "" : "s"}`)}
        </div>
      </section>

      <section>
        <h2>Account</h2>
        <dl class="account-grid">
          <div><dt>Household</dt><dd>${escapeHtml(data.householdLabel)}</dd></div>
          <div><dt>Contact</dt><dd>${escapeHtml(data.accountEmail ?? "—")}</dd></div>
          <div><dt>Plan</dt><dd>${escapeHtml(data.planLabel)}</dd></div>
        </dl>
      </section>

      <section>
        <h2>Alert channels &amp; weather</h2>
        <div class="pills">
          ${statusPill(data.forecastEnabled, "Forecast cold-risk")}
          ${statusPill(data.nwsEnabled, "Official NWS freeze alerts")}
        </div>
        <p class="muted-inline" style="margin: 12px 0 4px;">Configured delivery channels</p>
        <div class="channels">${channelList}</div>
      </section>

      <section>
        <h2>Monitored devices</h2>
        <table>
          <thead><tr><th>Device</th><th>Space</th><th>Sensors</th></tr></thead>
          <tbody>${deviceRows}</tbody>
        </table>
      </section>

      <p class="disclaimer">${escapeHtml(CLAIMS_DISCLAIMER)}</p>
      <p class="footer-links">
        Verify live status at <a href="${escapeHtml(data.siteUrl)}/system-status">${escapeHtml(data.siteUrl)}/system-status</a>
        · Product: <a href="${escapeHtml(data.siteUrl)}">${escapeHtml(data.siteUrl)}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
