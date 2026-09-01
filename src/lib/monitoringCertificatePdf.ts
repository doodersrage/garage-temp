import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MonitoringCertificateData } from "./monitoringCertificate";
import { CLAIMS_DISCLAIMER } from "./claimsPack";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 10;
const HEADING_SIZE = 12;
const TITLE_SIZE = 20;
const LINE = 13;
const ACCENT = rgb(0.92, 0.35, 0.05);
const ACCENT_LIGHT = rgb(1, 0.97, 0.94);
const MUTED = rgb(0.42, 0.45, 0.5);
const TEXT = rgb(0.12, 0.14, 0.17);

type PdfWriter = {
  page: PDFPage;
  y: number;
  ensureSpace(lines?: number): void;
  drawHero(data: MonitoringCertificateData): void;
  drawStatRow(items: Array<{ label: string; value: string; detail?: string }>): void;
  drawHeading(text: string): void;
  drawLine(text: string, opts?: { bold?: boolean; size?: number; indent?: number; color?: typeof TEXT }): void;
  drawBullets(items: string[]): void;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function createWriter(doc: PDFDocument, font: PDFFont, fontBold: PDFFont): PdfWriter {
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const writer: PdfWriter = {
    page,
    y,
    ensureSpace(lines = 1) {
      if (this.y - lines * LINE >= MARGIN) return;
      this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
      page = this.page;
      y = this.y;
    },
    drawHero(data) {
      this.page.drawRectangle({
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN - 96,
        width: CONTENT_WIDTH,
        height: 96,
        color: ACCENT_LIGHT,
        borderColor: ACCENT,
        borderWidth: 0,
      });
      this.page.drawRectangle({
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN - 96,
        width: CONTENT_WIDTH,
        height: 3,
        color: ACCENT,
      });

      this.page.drawText("ThermalTrace", {
        x: MARGIN + 14,
        y: PAGE_HEIGHT - MARGIN - 28,
        size: 11,
        font: fontBold,
        color: ACCENT,
      });
      this.page.drawText("MONITORING CERTIFICATE", {
        x: MARGIN + 14,
        y: PAGE_HEIGHT - MARGIN - 42,
        size: 8,
        font: fontBold,
        color: MUTED,
      });

      const title = data.householdLabel.length > 48
        ? `${data.householdLabel.slice(0, 45)}…`
        : data.householdLabel;
      this.page.drawText(title, {
        x: MARGIN + 14,
        y: PAGE_HEIGHT - MARGIN - 64,
        size: TITLE_SIZE,
        font: fontBold,
        color: TEXT,
      });
      this.page.drawText(`${data.exportedAtLabel} UTC · ${data.planLabel} plan`, {
        x: MARGIN + 14,
        y: PAGE_HEIGHT - MARGIN - 82,
        size: 9,
        font,
        color: MUTED,
      });

      this.y = PAGE_HEIGHT - MARGIN - 110;
    },
    drawStatRow(items) {
      const cols = Math.min(items.length, 4);
      const gap = 8;
      const colWidth = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
      const boxHeight = 52;
      this.ensureSpace(5);

      items.slice(0, cols).forEach((item, index) => {
        const x = MARGIN + index * (colWidth + gap);
        const top = this.y;
        this.page.drawRectangle({
          x,
          y: top - boxHeight,
          width: colWidth,
          height: boxHeight,
          color: rgb(0.98, 0.98, 0.99),
          borderColor: rgb(0.88, 0.89, 0.91),
          borderWidth: 1,
        });
        this.page.drawText(item.label.toUpperCase(), {
          x: x + 8,
          y: top - 14,
          size: 7,
          font,
          color: MUTED,
        });
        this.page.drawText(item.value, {
          x: x + 8,
          y: top - 30,
          size: 12,
          font: fontBold,
          color: TEXT,
        });
        if (item.detail) {
          this.page.drawText(item.detail, {
            x: x + 8,
            y: top - 44,
            size: 8,
            font,
            color: MUTED,
          });
        }
      });

      this.y -= boxHeight + 16;
    },
    drawHeading(text) {
      this.ensureSpace(2);
      this.y -= 6;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y + 10 },
        end: { x: MARGIN + CONTENT_WIDTH, y: this.y + 10 },
        thickness: 0.5,
        color: rgb(0.88, 0.89, 0.91),
      });
      this.page.drawText(text, {
        x: MARGIN,
        y: this.y - 2,
        size: HEADING_SIZE,
        font: fontBold,
        color: TEXT,
      });
      this.y -= HEADING_SIZE + 10;
    },
    drawLine(text, opts = {}) {
      const size = opts.size ?? BODY_SIZE;
      const useFont = opts.bold ? fontBold : font;
      const x = MARGIN + (opts.indent ?? 0);
      const maxWidth = CONTENT_WIDTH - (opts.indent ?? 0);
      const color = opts.color ?? TEXT;
      for (const line of wrapText(text, useFont, size, maxWidth)) {
        this.ensureSpace(1);
        this.page.drawText(line, {
          x,
          y: this.y,
          size,
          font: useFont,
          color,
        });
        this.y -= LINE;
      }
    },
    drawBullets(items) {
      for (const item of items) {
        this.drawLine(`• ${item}`, { indent: 6 });
      }
    },
  };

  return writer;
}

export async function buildMonitoringCertificatePdf(
  data: MonitoringCertificateData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = createWriter(doc, font, fontBold);

  w.drawHero(data);
  w.drawLine(
    "This certifies active freeze and leak monitoring configuration for the household below. Intended for insurers, landlords, and property managers — not a legal guarantee of coverage.",
    { size: 9, color: MUTED },
  );
  w.y -= 4;

  w.drawStatRow([
    { label: "Alerts", value: data.alertsEnabled ? "Enabled" : "Disabled" },
    { label: "Freeze threshold", value: `${data.freezeThresholdF}°F` },
    { label: "Data retention", value: data.dataRetentionLabel },
    {
      label: "Coverage",
      value: `${data.deviceCount} device${data.deviceCount === 1 ? "" : "s"}`,
      detail: `${data.sensorCount} sensor${data.sensorCount === 1 ? "" : "s"}`,
    },
  ]);

  w.drawHeading("Account");
  w.drawBullets([
    `Household: ${data.householdLabel}`,
    `Contact: ${data.accountEmail ?? "—"}`,
    `Plan: ${data.planLabel}`,
  ]);

  w.drawHeading("Alert channels & weather");
  w.drawBullets([
    `Forecast cold-risk: ${data.forecastEnabled ? "On" : "Off"}`,
    `Official NWS freeze alerts: ${data.nwsEnabled ? "On" : "Off"}`,
    data.alertChannels.length
      ? `Channels: ${data.alertChannels.join(", ")}`
      : "Channels: none configured",
  ]);

  w.drawHeading("Monitored devices");
  if (data.devices.length === 0) {
    w.drawLine("No devices registered.");
  } else {
    for (const device of data.devices) {
      const sensors = device.sensors.length
        ? device.sensors.map((s) => `${s.label} (${s.kind})`).join(", ")
        : "none";
      w.drawLine(`${device.name} · ${device.space ?? "—"}`, { bold: true, size: 9 });
      w.drawLine(sensors, { size: 9, indent: 10, color: MUTED });
      w.y -= 2;
    }
  }

  w.drawHeading("Disclaimer");
  w.drawLine(CLAIMS_DISCLAIMER, { size: 8, color: MUTED });
  w.drawLine(`Verify: ${data.siteUrl}/system-status`, { size: 8, color: MUTED });

  return doc.save();
}
