import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { discoverFeedProbes, formatProbeReading } from "../../../lib/feedDiscovery";
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

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: `Feed request failed (${response.status}).`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const payload = await response.json();
    const discovery = discoverFeedProbes(payload, body.jsonRoot?.trim() || "temp");
    const probeCount = discovery.probes.length;
    const avg = discovery.probes.find((probe) => probe.key === "avg");

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Found ${probeCount} probe${probeCount === 1 ? "" : "s"} (${discovery.format} JSON)${avg?.tempF != null ? `, average ${avg.tempF.toFixed(1)}°F` : ""}.`,
        format: discovery.format,
        jsonRoot: discovery.jsonRoot,
        probes: discovery.probes.map((probe) => ({
          key: probe.key,
          suggestedLabel: probe.suggestedLabel,
          label: probe.suggestedLabel,
          tempF: probe.tempF,
          humidity: probe.humidity,
          visible: probe.visible,
          source: probe.source,
          reading: formatProbeReading(probe),
        })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed test failed";
    return new Response(JSON.stringify({ ok: false, message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
