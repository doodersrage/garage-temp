import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { getSiteUrl } from "../../../lib/stripe";
import { buildClaimsPackHtml } from "../../../lib/claimsPack";
import { generateClaimsPackForUser } from "../../../lib/claimsPackGenerate";
import { createClaimsPackExport } from "../../../lib/claimsPackExports";

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

  // Persist a durable, tokenized export so the pack can be independently
  // re-viewed/verified later (e.g. via a link sent to an insurance
  // adjuster) instead of only existing as this one-time download. If the
  // user has no household yet, there's nothing to scope the export to --
  // the download still works, it just won't carry a verification block.
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
  const filename = `thermaltrace-claims-${fromQ}-to-${toQ}.html`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
