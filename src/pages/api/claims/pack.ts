import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { getSiteUrl } from "../../../lib/stripe";
import { buildClaimsPackHtml } from "../../../lib/claimsPack";
import { generateClaimsPackForUser } from "../../../lib/claimsPackGenerate";
import { createClaimsPackExport } from "../../../lib/claimsPackExports";
import { renderDocumentPdf } from "../../../lib/documentPdf";

export const GET: APIRoute = async ({ cookies, url, request }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUseClaimsPack) {
    return new Response("Claims pack requires Pro", { status: 403 });
  }

  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const { pack, householdId, fromQ, toQ } = await generateClaimsPackForUser(
    user,
    entitlements,
    { from: url.searchParams.get("from"), to: url.searchParams.get("to") },
    siteUrl,
  );

  let packToRender = pack;
  if (householdId) {
    const { token, contentHash } = await createClaimsPackExport(householdId, pack, user.id);
    if (token) {
      packToRender = {
        ...pack,
        verifyUrl: `${siteUrl}/api/claims/pack/${token}`,
        contentHash,
      };
    }
  }

  const html = buildClaimsPackHtml(packToRender);
  const filenameBase = `thermaltrace-claims-${fromQ}-to-${toQ}`;
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

  const pdf = await renderDocumentPdf({ html });
  if (!pdf) {
    return new Response(
      "PDF generation is temporarily unavailable. Try ?format=html or retry shortly.",
      { status: 503 },
    );
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
