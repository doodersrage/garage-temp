import type { APIRoute } from "astro";
import { getSiteUrl } from "../../../../lib/stripe";
import { buildClaimsPackHtml } from "../../../../lib/claimsPack";
import {
  computeClaimsPackHash,
  getClaimsPackExportByToken,
} from "../../../../lib/claimsPackExports";

/**
 * Public, token-gated view of a previously generated claims pack -- same
 * trust model as share/[token].astro and status/[token].astro: whoever has
 * the (long, random) token can view it. Meant for opening directly in a
 * browser (an adjuster clicking a link), not a forced download.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const token = params.token?.trim();
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const pack = await getClaimsPackExportByToken(token);
  if (!pack) {
    return new Response("Not found", { status: 404 });
  }

  // Recompute the hash from the stored data on every view -- if the row
  // was ever hand-edited in the database, this would no longer match the
  // hash embedded in the original download, which is the whole point of
  // having one.
  const contentHash = await computeClaimsPackHash(pack);
  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const html = buildClaimsPackHtml({
    ...pack,
    verifyUrl: `${siteUrl}/api/claims/pack/${token}`,
    contentHash,
  });

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
