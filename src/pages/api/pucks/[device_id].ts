import type { APIRoute } from "astro";
import { getAuthFromRequest } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { getPuck } from "../../../lib/pucks";

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const { session, user } = await getAuthFromRequest(request, cookies);
  if (!session || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const deviceId = params.device_id ?? "";
  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (household.error || !household.householdId) {
    return json(500, { error: household.error ?? "household" });
  }

  const puck = await getPuck(deviceId);
  if (!puck || puck.household_id !== household.householdId) {
    return json(404, { error: "unknown_device" });
  }

  return json(200, {
    device_id: puck.device_id,
    bay_id: puck.bay_id,
    space_name: puck.space_name,
  });
};
