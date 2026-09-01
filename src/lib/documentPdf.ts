import { renderHtmlToPdf } from "./htmlToPdf";
import { buildMonitoringCertificatePdf } from "./monitoringCertificatePdf";
import type { MonitoringCertificateData } from "./monitoringCertificate";

export type PdfRenderResult = {
  bytes: Uint8Array;
  source: "browser" | "programmatic";
};

/** Prefer Browser Run HTML rendering; optional programmatic fallback. */
export async function renderDocumentPdf(input: {
  html: string;
  monitoringFallback?: MonitoringCertificateData;
}): Promise<PdfRenderResult | null> {
  const fromBrowser = await renderHtmlToPdf(input.html);
  if (fromBrowser) {
    return { bytes: fromBrowser, source: "browser" };
  }

  if (input.monitoringFallback) {
    return {
      bytes: await buildMonitoringCertificatePdf(input.monitoringFallback),
      source: "programmatic",
    };
  }

  return null;
}
