import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getSiteUrl } from "../../../lib/stripe";
import { generateMonitoringCertificateForUser } from "../../../lib/monitoringCertificateGenerate";

export const GET: APIRoute = async ({ cookies, request }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const { html, filename, error } = await generateMonitoringCertificateForUser(user, siteUrl);

  if (error || !html) {
    return new Response(error ?? "Could not generate certificate", { status: 400 });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
