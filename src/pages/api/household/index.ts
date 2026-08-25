import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { createServerClient } from "../../../lib/supabase";
import {
  getOwnedHouseholdId,
  getOrCreateHouseholdForUser,
  listHouseholdMembers,
  listUserHouseholds,
  removeHouseholdMember,
  setActiveHouseholdForUser,
  updateHouseholdName,
} from "../../../lib/households";
import {
  createHouseholdInvite,
  listPendingInvites,
  sendInviteEmail,
} from "../../../lib/householdInvites";
import { buildSiteUrl } from "../../../lib/stripe";

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (household.error) {
    return new Response(JSON.stringify({ error: household.error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [members, households, invites] = await Promise.all([
    listHouseholdMembers(household.householdId),
    listUserHouseholds(user.id),
    listPendingInvites(household.householdId),
  ]);

  return new Response(
    JSON.stringify({
      householdId: household.householdId,
      members: members.members,
      households: households.households,
      invites: invites.invites,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const action = formData.get("action")?.toString() ?? "invite";
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/household";

  if (action === "switch") {
    const householdId = formData.get("household_id")?.toString();
    if (!householdId) {
      return redirect(`${redirectTo}?error=1`);
    }
    const result = await setActiveHouseholdForUser(user.id, householdId);
    if (result.error) {
      return redirect(`${redirectTo}?error=${encodeURIComponent(result.error)}`);
    }
    return redirect(`${redirectTo}?switched=1`);
  }

  const ownedId = await getOwnedHouseholdId(user.id);
  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  const manageId = ownedId ?? household.householdId;

  if (!manageId) {
    return redirect(`${redirectTo}?error=1`);
  }

  if (action === "rename") {
    const name = formData.get("name")?.toString() ?? "";
    await updateHouseholdName(manageId, name);
    return redirect(`${redirectTo}?saved=1`);
  }

  if (action === "remove") {
    const memberUserId = formData.get("user_id")?.toString();
    if (!memberUserId) {
      return redirect(`${redirectTo}?error=1`);
    }
    const result = await removeHouseholdMember(manageId, memberUserId);
    if (result.error) {
      return redirect(`${redirectTo}?error=${encodeURIComponent(result.error)}`);
    }
    return redirect(`${redirectTo}?removed=1`);
  }

  // Email invite link (does not require existing account)
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) {
    return redirect(`${redirectTo}?error=missing_email`);
  }

  const { invite, error } = await createHouseholdInvite(manageId, email, user.id);
  if (error || !invite) {
    return redirect(`${redirectTo}?error=1`);
  }

  const supabase = createServerClient();
  const { data: householdRow } = await supabase
    .from("households")
    .select("name")
    .eq("id", manageId)
    .maybeSingle();

  const acceptUrl = buildSiteUrl(request, `/invite/${invite.token}`);
  await sendInviteEmail(
    email,
    acceptUrl,
    householdRow?.name ?? "a household",
    user.email ?? null,
  );

  return redirect(`${redirectTo}?invited=1`);
};
