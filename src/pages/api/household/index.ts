import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { createAdminClient } from "../../../lib/supabase";
import {
  addHouseholdMemberByUserId,
  getOrCreateHouseholdForUser,
  listHouseholdMembers,
  removeHouseholdMember,
  updateHouseholdName,
} from "../../../lib/households";
import { isUserInHousehold } from "../../../lib/households";

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

  const members = await listHouseholdMembers(household.householdId);
  return new Response(
    JSON.stringify({
      householdId: household.householdId,
      members: members.members,
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

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (household.error || !household.householdId) {
    return redirect(`${redirectTo}?error=1`);
  }

  if (action === "rename") {
    const name = formData.get("name")?.toString() ?? "";
    await updateHouseholdName(household.householdId, name);
    return redirect(`${redirectTo}?saved=1`);
  }

  if (action === "remove") {
    const memberUserId = formData.get("user_id")?.toString();
    if (!memberUserId) {
      return redirect(`${redirectTo}?error=1`);
    }
    const result = await removeHouseholdMember(household.householdId, memberUserId);
    if (result.error) {
      return redirect(`${redirectTo}?error=${encodeURIComponent(result.error)}`);
    }
    return redirect(`${redirectTo}?removed=1`);
  }

  // invite by email
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) {
    return redirect(`${redirectTo}?error=missing_email`);
  }

  const admin = createAdminClient();
  const { data: listed, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return redirect(`${redirectTo}?error=lookup`);
  }

  const target = listed.users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (!target) {
    return redirect(`${redirectTo}?error=user_not_found`);
  }

  if (await isUserInHousehold(target.id, household.householdId)) {
    return redirect(`${redirectTo}?error=already_member`);
  }

  const add = await addHouseholdMemberByUserId(
    household.householdId,
    target.id,
    "member",
  );

  if (add.error) {
    return redirect(`${redirectTo}?error=1`);
  }

  return redirect(`${redirectTo}?invited=1`);
};
