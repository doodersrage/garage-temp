import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MonitoringCertificateData } from "./monitoringCertificate";
import { CLAIMS_DISCLAIMER } from "./claimsPack";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const BODY_SIZE = 10;
const HEADING_SIZE = 14;
const TITLE_SIZE = 18;
const LINE = 14;

type PdfWriter = {
  page: PDFPage;
  y: number;
  ensureSpace(lines?: number): void;
  drawTitle(text: string): void;
  drawHeading(text: string): void;
  drawLine(text: string, opts?: { bold?: boolean; size?: number; indent?: number }): void;
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
    drawTitle(text) {
      this.ensureSpace(2);
      this.page.drawText(text, {
        x: MARGIN,
        y: this.y,
        size: TITLE_SIZE,
        font: fontBold,
        color: rgb(0.07, 0.07, 0.07),
      });
      this.y -= TITLE_SIZE + 6;
    },
    drawHeading(text) {
      this.ensureSpace(2);
      this.y -= 4;
      this.page.drawText(text, {
        x: MARGIN,
        y: this.y,
        size: HEADING_SIZE,
        font: fontBold,
        color: rgb(0.07, 0.07, 0.07),
      });
      this.y -= HEADING_SIZE + 4;
    },
    drawLine(text, opts = {}) {
      const size = opts.size ?? BODY_SIZE;
      const useFont = opts.bold ? fontBold : font;
      const x = MARGIN + (opts.indent ?? 0);
      const maxWidth = PAGE_WIDTH - MARGIN * 2 - (opts.indent ?? 0);
      for (const line of wrapText(text, useFont, size, maxWidth)) {
        this.ensureSpace(1);
        this.page.drawText(line, {
          x,
          y: this.y,
          size,
          font: useFont,
          color: rgb(0.15, 0.15, 0.15),
        });
        this.y -= LINE;
      }
    },
    drawBullets(items) {
      for (const item of items) {
        this.drawLine(`• ${item}`, { indent: 8 });
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

  w.drawTitle("ThermalTrace monitoring certificate");
  w.drawLine(`Generated ${data.exportedAt} · ${data.householdLabel}`, {
    size: 9,
  });
  w.drawLine(
    "This certifies that the household below uses ThermalTrace for freeze and leak monitoring with the configuration shown. It is intended for insurers, landlords, or property managers — not as a legal guarantee of coverage.",
  );

  w.drawHeading("Account");
  w.drawBullets([
    `Household: ${data.householdLabel}`,
    `Contact: ${data.accountEmail ?? "—"}`,
    `Alerts: ${data.alertsEnabled ? "Enabled" : "Disabled"}`,
    `Freeze threshold: ${data.freezeThresholdF}°F`,
    `Data retention: ${data.dataRetentionDays} days`,
  ]);

  w.drawHeading("Alert channels");
  w.drawLine(
    data.alertChannels.length ? data.alertChannels.join(", ") : "None configured",
  );
  w.drawBullets([
    `Forecast cold-risk: ${data.forecastEnabled ? "On" : "Off"}`,
    `Official NWS freeze alerts: ${data.nwsEnabled ? "On" : "Off"}`,
  ]);

  w.drawHeading("Monitored devices");
  if (data.devices.length === 0) {
    w.drawLine("No devices registered.");
  } else {
    for (const device of data.devices) {
      const sensors = device.sensors.length
        ? device.sensors.map((s) => `${s.label} (${s.kind})`).join(", ")
        : "none";
      w.drawLine(
        `${device.name} · ${device.space ?? "—"} · ${device.sensors.length} sensor(s): ${sensors}`,
        { size: 9 },
      );
    }
  }

  w.drawHeading("Disclaimer");
  w.drawLine(CLAIMS_DISCLAIMER, { size: 8 });
  w.drawLine(`Verify live status: ${data.siteUrl}/system-status`, { size: 8 });
  w.drawLine(`Product: ${data.siteUrl}`, { size: 8 });

  return doc.save();
}
