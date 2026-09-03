import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchCrossPropertySnapshots } from "../../../lib/crossProperty";
import { getUserEntitlements } from "../../../lib/entitlements";
import { scorePropertyHealth } from "../../../lib/portfolioHealth";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUsePortfolio) {
    return new Response(JSON.stringify({ error: "Portfolio requires Pro or Portfolio plan" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { properties, error } = await fetchCrossPropertySnapshots(user.id);
  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      properties: properties.map((p) => {
        const health = scorePropertyHealth(p);
        return {
          household_id: p.householdId,
          name: p.name,
          role: p.role,
          min_temp_f: p.minTempF,
          freeze_threshold_f: p.freezeThresholdF,
          at_risk: p.atRisk,
          last_reading_at: p.lastReadingAt,
          device_count: p.deviceCount,
          health_score: health.score,
          health_label: health.label,
          health_detail: health.detail,
        };
      }),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};
