import type { APIRoute } from "astro";
import { getAuthFromRequest } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { registerPuck } from "../../../lib/pucks";

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const { session, user } = await getAuthFromRequest(request, cookies);
  if (!session || !user) {
    return json(401, { error: "Unauthorized" });
  }

  let body: { device_id?: string; secret_hex?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (household.error || !household.householdId) {
    return json(500, { error: household.error ?? "household" });
  }

  const result = await registerPuck({
    deviceId: body.device_id ?? "",
    secretHex: body.secret_hex ?? "",
    householdId: household.householdId,
    createdBy: user.id,
  });

  if (!result.ok) {
    return json(result.status, { error: result.error });
  }
  return json(200, { ok: true });
};
