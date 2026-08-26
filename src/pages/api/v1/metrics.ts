import type { APIRoute } from "astro";
import { resolveApiKey } from "../../../lib/apiKeys";
import { buildPrometheusText } from "../../../lib/prometheusMetrics";

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) {
    return new Response(JSON.stringify({ error: "Missing Bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = await resolveApiKey(match[1]!);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await buildPrometheusText(resolved.householdId);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
