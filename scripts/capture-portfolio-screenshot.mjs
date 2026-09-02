/**
 * Renders a dark-theme Portfolio table matching /dashboard/portfolio
 * and writes src/assets/marketing/thermaltrace-dashboard-portfolio.jpg
 *
 * Usage: node scripts/capture-portfolio-screenshot.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "../src/assets/marketing");
const outFile = path.join(outDir, "thermaltrace-dashboard-portfolio.jpg");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    :root {
      --bg: #0f1419;
      --surface: #151b24;
      --border: #2a3444;
      --text: #e8eef7;
      --muted: #94a3b8;
      --accent: #60a5fa;
      --warning: #f59e0b;
      --warning-text: #fbbf24;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      padding: 28px 32px 36px;
      width: 1024px;
    }
    .kicker {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 8px;
      font-weight: 600;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 650;
    }
    .sub {
      margin: 0 0 20px;
      color: var(--muted);
      font-size: 14px;
    }
    .risk {
      border: 1px solid color-mix(in srgb, var(--warning) 35%, var(--border));
      background: color-mix(in srgb, var(--warning) 8%, var(--surface));
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .risk h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: var(--warning-text);
    }
    .risk p { margin: 0; font-size: 13px; color: var(--muted); }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 16px 4px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th {
      text-align: left;
      padding: 12px 8px;
      color: var(--muted);
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.02em;
    }
    td {
      padding: 12px 8px;
      border-top: 1px solid var(--border);
      vertical-align: middle;
    }
    .name { color: var(--accent); font-weight: 600; }
    .badge {
      margin-left: 8px;
      font-size: 11px;
      color: var(--warning-text);
      font-weight: 600;
    }
    .role { text-transform: capitalize; color: var(--muted); }
  </style>
</head>
<body>
  <p class="kicker">Portfolio</p>
  <h1>All properties</h1>
  <p class="sub">Cross-property freeze risk at a glance</p>
  <div class="risk">
    <h2>2 properties at freeze risk today</h2>
    <p>Oak Street Unit B — 31.2°F (threshold 34°F) · Lake Cabin — 33.1°F (threshold 34°F)</p>
  </div>
  <div class="card" id="shot">
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Role</th>
          <th>Min temp</th>
          <th>Devices</th>
          <th>Last reading</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="name">Oak Street Unit B</span><span class="badge">At risk</span></td>
          <td class="role">Owner</td>
          <td>31.2°F</td>
          <td>4</td>
          <td>12 min ago</td>
        </tr>
        <tr>
          <td><span class="name">Lake Cabin</span><span class="badge">At risk</span></td>
          <td class="role">Owner</td>
          <td>33.1°F</td>
          <td>2</td>
          <td>8 min ago</td>
        </tr>
        <tr>
          <td><span class="name">Main House Garage</span></td>
          <td class="role">Owner</td>
          <td>41.6°F</td>
          <td>3</td>
          <td>3 min ago</td>
        </tr>
        <tr>
          <td><span class="name">Pine Court #12</span></td>
          <td class="role">Property manager</td>
          <td>46.8°F</td>
          <td>2</td>
          <td>19 min ago</td>
        </tr>
        <tr>
          <td><span class="name">Workshop Bay</span></td>
          <td class="role">Owner</td>
          <td>52.4°F</td>
          <td>5</td>
          <td>5 min ago</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1024, height: 720 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "networkidle" });
const body = page.locator("body");
const box = await body.boundingBox();
const buf = await page.screenshot({
  type: "jpeg",
  quality: 88,
  clip: {
    x: 0,
    y: 0,
    width: 1024,
    height: Math.min(Math.ceil(box?.height ?? 520), 560),
  },
});
await writeFile(outFile, buf);
await browser.close();
console.log(`Wrote ${outFile}`);
