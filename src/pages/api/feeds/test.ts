import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchTempFeed } from "../../../lib/FetchTemps";
import { isValidFeedUrl } from "../../../lib/tempFeedConfig";
import { requireHouseholdEditor } from "../../../lib/householdAuth";
import { checkFeedTestRateLimit } from "../../../lib/feedTestLimits";

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return new Response(JSON.stringify({ ok: false, message: "Sign in required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rate = checkFeedTestRateLimit(user.id || clientAddress || "unknown");
  if (!rate.ok) {
    return new Response(
      JSON.stringify({ ok: false, message: "Too many feed tests. Try again shortly." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...(rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : {}),
        },
      },
    );
  }

  const editor = await requireHouseholdEditor(user.id);
  if (!editor.ok) {
    return new Response(JSON.stringify({ ok: false, message: "View-only access." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json()) as { url?: string; jsonRoot?: string };
  const url = body.url?.trim();

  if (!url || !isValidFeedUrl(url)) {
    return new Response(
      JSON.stringify({ ok: false, message: "Enter a valid HTTPS feed URL." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await fetchTempFeed({
    id: "test",
    name: "Test feed",
    url,
    enabled: true,
    jsonRoot: body.jsonRoot?.trim() || "temp",
  });

  if (result.error) {
    return new Response(
      JSON.stringify({ ok: false, message: result.error }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const probeCount = Object.keys(result.probes).length;
  const avg = result.probes.avg;

  return new Response(
    JSON.stringify({
      ok: true,
      message: `Feed OK — ${probeCount} probe(s) found${avg ? `, average ${avg.f.toFixed(1)}°F` : ""}.`,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
