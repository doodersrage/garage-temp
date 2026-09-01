import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getSiteUrl } from "../../../lib/stripe";
import { generateMonitoringCertificateForUser } from "../../../lib/monitoringCertificateGenerate";
import { renderDocumentPdf } from "../../../lib/documentPdf";

export const GET: APIRoute = async ({ cookies, request, url }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const { html, data, filenameBase, error } = await generateMonitoringCertificateForUser(
    user,
    siteUrl,
  );

  if (error || !html || !data) {
    return new Response(error ?? "Could not generate certificate", { status: 400 });
  }

  const format = url.searchParams.get("format")?.toLowerCase();
  if (format === "html") {
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.html"`,
      },
    });
  }

  const pdf = await renderDocumentPdf({ html, monitoringFallback: data });
  if (!pdf) {
    return new Response("PDF generation unavailable", { status: 503 });
  }

  return new Response(pdf.bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
      "X-Pdf-Source": pdf.source,
    },
  });
};
