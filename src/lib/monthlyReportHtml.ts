import type { ChartPoint } from "./garageTempsHistory";
import type { NightRisk } from "./FetchWeather";
import type { FreezeHoursSummary } from "./freezeHours";

export type MonthlyProbeSummary = {
  label: string;
  minF: number;
  maxF: number;
  avgHumidity: number;
  readingCount: number;
};

export type MonthlyReportData = {
  monthLabel: string;
  readingCount: number;
  minTempF: number | null;
  maxTempF: number | null;
  avgTempF: number | null;
  freezeThresholdF: number;
  nightsAtRisk: number;
  nights: NightRisk[];
  freezeHours: FreezeHoursSummary;
  probes: MonthlyProbeSummary[];
  alertsUrl: string;
  historyUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTemp(value: number | null): string {
  return value != null ? `${value.toFixed(1)}°F` : "—";
}

export function summarizeProbesForReport(points: ChartPoint[]): MonthlyProbeSummary[] {
  const byProbe = new Map<string, ChartPoint[]>();
  for (const point of points) {
    const group = byProbe.get(point.probeLabel) ?? [];
    group.push(point);
    byProbe.set(point.probeLabel, group);
  }

  return [...byProbe.entries()].map(([label, probePoints]) => {
    const temps = probePoints.map((p) => p.tempf);
    const humidities = probePoints.map((p) => p.humidity);
    return {
      label,
      minF: Math.min(...temps),
      maxF: Math.max(...temps),
      avgHumidity:
        humidities.reduce((sum, value) => sum + value, 0) / humidities.length,
      readingCount: probePoints.length,
    };
  });
}

export function buildMonthlyReportPlainText(data: MonthlyReportData): string {
  const lines = [
    `Garage Temp monthly report — ${data.monthLabel}`,
    "",
    `Readings (30d): ${data.readingCount}`,
    `Coldest: ${formatTemp(data.minTempF)}`,
    `Warmest: ${formatTemp(data.maxTempF)}`,
    `Average: ${formatTemp(data.avgTempF)}`,
    `Hours at or below ${data.freezeThresholdF}°F: ${data.freezeHours.hoursBelow34.toFixed(1)}`,
    `Forecast nights at risk (next 7d): ${data.nightsAtRisk}`,
    "",
  ];

  if (data.probes.length > 0) {
    lines.push("By probe:");
    for (const probe of data.probes) {
      lines.push(
        `  ${probe.label}: ${probe.minF.toFixed(1)}–${probe.maxF.toFixed(1)} °F, avg humidity ${probe.avgHumidity.toFixed(0)}% (${probe.readingCount} readings)`,
      );
    }
    lines.push("");
  }

  if (data.nights.length > 0) {
    lines.push("Upcoming nights:");
    for (const night of data.nights) {
      lines.push(
        `  ${night.dateLabel}: ${night.minTempF.toFixed(0)}°F ${night.atRisk ? "(at risk)" : "(OK)"}`,
      );
    }
    lines.push("");
  }

  lines.push(`Manage alerts: ${data.alertsUrl}`);
  lines.push(`View history: ${data.historyUrl}`);
  lines.push("");
  lines.push("A full HTML report is attached — open it in your browser or print to PDF.");

  return lines.join("\n");
}

function statBlock(label: string, value: string, detail?: string): string {
  return `<div style="background:#151b24;border:1px solid #2a3441;border-radius:12px;padding:16px">
    <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(label)}</div>
    <div style="color:#f8fafc;font-size:24px;font-weight:600;margin-top:6px">${escapeHtml(value)}</div>
    ${detail ? `<div style="color:#64748b;font-size:12px;margin-top:4px">${escapeHtml(detail)}</div>` : ""}
  </div>`;
}

export function buildMonthlyReportHtmlDocument(data: MonthlyReportData): string {
  const probeRows =
    data.probes.length === 0
      ? `<tr><td colspan="4" style="padding:12px;color:#94a3b8">No probe readings in the last 30 days.</td></tr>`
      : data.probes
          .map(
            (probe) =>
              `<tr>
                <td style="padding:10px 12px;border-top:1px solid #2a3441">${escapeHtml(probe.label)}</td>
                <td style="padding:10px 12px;border-top:1px solid #2a3441">${probe.minF.toFixed(1)}–${probe.maxF.toFixed(1)}°F</td>
                <td style="padding:10px 12px;border-top:1px solid #2a3441">${probe.avgHumidity.toFixed(0)}%</td>
                <td style="padding:10px 12px;border-top:1px solid #2a3441">${probe.readingCount}</td>
              </tr>`,
          )
          .join("");

  const nightRows =
    data.nights.length === 0
      ? `<tr><td colspan="3" style="padding:12px;color:#94a3b8">No forecast data available.</td></tr>`
      : data.nights
          .map(
            (night) =>
              `<tr>
                <td style="padding:10px 12px;border-top:1px solid #2a3441">${escapeHtml(night.dateLabel)}</td>
                <td style="padding:10px 12px;border-top:1px solid #2a3441">${night.minTempF.toFixed(0)}°F</td>
                <td style="padding:10px 12px;border-top:1px solid #2a3441;color:${night.atRisk ? "#f87171" : "#4ade80"}">${night.atRisk ? "At risk" : "OK"}</td>
              </tr>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Garage Temp report — ${escapeHtml(data.monthLabel)}</title>
</head>
<body style="margin:0;padding:24px;background:#090b0f;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;line-height:1.5">
  <div style="max-width:720px;margin:0 auto">
    <header style="margin-bottom:24px">
      <p style="margin:0 0 8px;color:#60a5fa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Garage Temp Monitor</p>
      <h1 style="margin:0 0 8px;font-size:28px;color:#f8fafc">Monthly report — ${escapeHtml(data.monthLabel)}</h1>
      <p style="margin:0;color:#94a3b8">30-day snapshot from your saved readings and forecast outlook.</p>
    </header>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px">
      ${statBlock("Readings", String(data.readingCount))}
      ${statBlock("Coldest", formatTemp(data.minTempF))}
      ${statBlock("Warmest", formatTemp(data.maxTempF))}
      ${statBlock("Average", formatTemp(data.avgTempF))}
      ${statBlock("Freeze hours", `${data.freezeHours.hoursBelow34.toFixed(1)} h`, `≤ ${data.freezeThresholdF}°F`)}
      ${statBlock("Nights at risk", String(data.nightsAtRisk), "Next 7 days forecast")}
    </section>

    <section style="margin-bottom:24px">
      <h2 style="margin:0 0 12px;font-size:18px;color:#f8fafc">By probe</h2>
      <table style="width:100%;border-collapse:collapse;background:#111827;border:1px solid #2a3441;border-radius:12px;overflow:hidden">
        <thead>
          <tr style="background:#151b24;color:#94a3b8;text-align:left;font-size:12px">
            <th style="padding:10px 12px">Probe</th>
            <th style="padding:10px 12px">Range</th>
            <th style="padding:10px 12px">Avg humidity</th>
            <th style="padding:10px 12px">Readings</th>
          </tr>
        </thead>
        <tbody>${probeRows}</tbody>
      </table>
    </section>

    <section style="margin-bottom:24px">
      <h2 style="margin:0 0 12px;font-size:18px;color:#f8fafc">Forecast nights</h2>
      <table style="width:100%;border-collapse:collapse;background:#111827;border:1px solid #2a3441;border-radius:12px;overflow:hidden">
        <thead>
          <tr style="background:#151b24;color:#94a3b8;text-align:left;font-size:12px">
            <th style="padding:10px 12px">Night</th>
            <th style="padding:10px 12px">Low</th>
            <th style="padding:10px 12px">Status</th>
          </tr>
        </thead>
        <tbody>${nightRows}</tbody>
      </table>
    </section>

    <footer style="border-top:1px solid #2a3441;padding-top:16px;color:#94a3b8;font-size:13px">
      <p style="margin:0 0 8px">
        <a href="${escapeHtml(data.historyUrl)}" style="color:#60a5fa">View history</a>
        ·
        <a href="${escapeHtml(data.alertsUrl)}" style="color:#60a5fa">Manage alerts</a>
      </p>
      <p style="margin:0">Print this page (Ctrl/Cmd+P) to save as PDF.</p>
    </footer>
  </div>
</body>
</html>`;
}

/** Shorter HTML for the email body (stats only). */
export function buildMonthlyReportHtmlEmail(data: MonthlyReportData): string {
  return `<div style="font-family:system-ui,sans-serif;color:#111;line-height:1.5">
    <h2 style="margin:0 0 12px">Monthly garage report — ${escapeHtml(data.monthLabel)}</h2>
    <p style="margin:0 0 16px">30-day summary from Garage Temp Monitor. See the attached HTML report for full probe and forecast tables.</p>
    <ul style="margin:0 0 16px;padding-left:20px">
      <li>Readings: <strong>${data.readingCount}</strong></li>
      <li>Coldest: <strong>${formatTemp(data.minTempF)}</strong></li>
      <li>Warmest: <strong>${formatTemp(data.maxTempF)}</strong></li>
      <li>Average: <strong>${formatTemp(data.avgTempF)}</strong></li>
      <li>Freeze hours (≤ ${data.freezeThresholdF}°F): <strong>${data.freezeHours.hoursBelow34.toFixed(1)}</strong></li>
      <li>Forecast nights at risk: <strong>${data.nightsAtRisk}</strong></li>
    </ul>
    <p style="margin:0"><a href="${escapeHtml(data.alertsUrl)}">Manage alerts</a> · <a href="${escapeHtml(data.historyUrl)}">View history</a></p>
  </div>`;
}

export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
