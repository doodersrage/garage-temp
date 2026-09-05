import type { APIRoute } from "astro";
import { getAuthFromRequest } from "../../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../../lib/households";
import { isBayMood } from "../../../../lib/bayMood";
import {
  resolveBayMoodForHousehold,
  setBayMoodOverride,
} from "../../../../lib/pucks";

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

  const bayId = params.bay_id ?? "";
  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (household.error || !household.householdId) {
    return json(500, { error: household.error ?? "household" });
  }

  const result = await resolveBayMoodForHousehold({
    bayId,
    householdId: household.householdId,
  });
  if (!result.ok) {
    return json(result.status, { error: result.error });
  }

  return json(200, {
    bay_id: result.bayId,
    mood: result.mood,
    updated_at: result.updatedAt,
    space_name: result.spaceName,
    source: result.source,
  });
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const { session, user } = await getAuthFromRequest(request, cookies);
  if (!session || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const bayId = params.bay_id ?? "";
  let body: { mood?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const mood = (body.mood ?? "").toLowerCase();
  if (!isBayMood(mood)) {
    return json(400, { error: "bad_mood" });
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (household.error || !household.householdId) {
    return json(500, { error: household.error ?? "household" });
  }

  const result = await setBayMoodOverride({
    bayId,
    householdId: household.householdId,
    mood,
  });
  if (!result.ok) {
    return json(result.status, { error: result.error });
  }

  return json(200, { bay_id: bayId, mood });
};
