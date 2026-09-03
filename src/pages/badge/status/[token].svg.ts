import type { APIRoute } from "astro";
import { resolveStatusPageToken, buildStatusPageSnapshot } from "../../../lib/statusPage";
import { escapeHtml } from "../../../lib/htmlEscape";

export const prerender = false;

function badgeSvg(label: string, status: string, color: string): string {
  const left = "ThermalTrace";
  const right = status;
  const leftW = 86;
  const rightW = Math.max(70, Math.min(160, 10 + right.length * 7));
  const total = leftW + rightW;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${escapeHtml(label)}: ${escapeHtml(status)}">
  <title>${escapeHtml(label)}: ${escapeHtml(status)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="20" fill="#0f172a"/>
    <rect x="${leftW}" width="${rightW}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftW / 2}" y="14">${left}</text>
    <text x="${leftW + rightW / 2}" y="14">${escapeHtml(right)}</text>
  </g>
</svg>`;
}

export const GET: APIRoute = async ({ params }) => {
  const token = params.token?.trim();
  if (!token) {
    return new Response(badgeSvg("status", "missing", "#64748b"), {
      status: 400,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const resolved = await resolveStatusPageToken(token);
  if (!resolved) {
    return new Response(badgeSvg("status", "unknown", "#64748b"), {
      status: 404,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const snapshot = await buildStatusPageSnapshot(resolved.householdId);
  const temps = snapshot.sensors.filter(
    (s) => s.kind === "temperature" && s.value_num != null && Number.isFinite(s.value_num),
  );
  const minTemp =
    temps.length > 0 ? Math.min(...temps.map((s) => s.value_num as number)) : null;
  const wetCount = snapshot.sensors.filter(
    (s) => s.kind === "flood" && s.value_bool === true,
  ).length;

  let status = "ok";
  let color = "#15803d";
  if (snapshot.stale || snapshot.sensorCount === 0) {
    status = "stale";
    color = "#b45309";
  } else if (wetCount > 0) {
    status = wetCount === 1 ? "wet" : `${wetCount} wet`;
    color = "#0369a1";
  } else if (minTemp != null && minTemp <= 34) {
    status = `${minTemp.toFixed(0)}°F risk`;
    color = "#c2410c";
  } else if (minTemp != null) {
    status = `${minTemp.toFixed(0)}°F`;
    color = "#0284c7";
  }

  return new Response(badgeSvg("status", status, color), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120",
    },
  });
};
