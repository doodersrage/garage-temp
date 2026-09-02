import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchTemps } from "../../../lib/FetchTemps";
import { requireHouseholdEditor } from "../../../lib/householdAuth";

/** Fetch pull feeds now and persist readings (same as scheduled collector). */
export const POST: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const editor = await requireHouseholdEditor(user.id);
  if (!editor.ok) {
    return new Response(JSON.stringify({ ok: false, error: "View-only access." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = await fetchTemps({
    userId: user.id,
    userEmail: user.email,
    userMetadata: user.user_metadata as Record<string, unknown>,
    saveToDatabase: true,
    sendAlerts: true,
  });

  const summary = results.map((result) => ({
    feedId: result.id,
    name: result.name,
    ok: !result.error,
    message: result.error ?? `${Object.keys(result.probes).length} probe(s)`,
    probeCount: Object.keys(result.probes).length,
  }));

  return new Response(
    JSON.stringify({
      ok: true,
      fetchedAt: new Date().toISOString(),
      feeds: summary,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
