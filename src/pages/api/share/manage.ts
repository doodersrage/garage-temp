import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { getUserEntitlements } from "../../../lib/entitlements";
import { createServerClient } from "../../../lib/supabase";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (!household.householdId) {
    return new Response(JSON.stringify({ error: household.error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("id, token, scope, label, expires_at, created_at")
    .eq("household_id", household.householdId)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ links: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return redirect("/signin");
  }

  const entitlements = await getUserEntitlements(user.id);
  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/share";
  const action = formData.get("action")?.toString() ?? "create";

  if (!entitlements.canCreateShareLinks) {
    return redirect(`${redirectTo}?error=pro_required`);
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (!household.householdId) {
    return redirect(`${redirectTo}?error=1`);
  }

  const supabase = createServerClient();

  if (action === "revoke") {
    const id = formData.get("id")?.toString();
    if (id) {
      await supabase
        .from("share_links")
        .delete()
        .eq("id", id)
        .eq("household_id", household.householdId);
    }
    return redirect(`${redirectTo}?revoked=1`);
  }

  const scope = formData.get("scope")?.toString() === "history" ? "history" : "live";
  const label = formData.get("label")?.toString().trim() || null;
  const expiresDays = Number(formData.get("expires_days") ?? 0);
  const expires_at =
    expiresDays > 0
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const token = randomToken();
  const { error } = await supabase.from("share_links").insert({
    token,
    household_id: household.householdId,
    scope,
    label,
    expires_at,
    created_by: user.id,
  });

  if (error) {
    return redirect(`${redirectTo}?error=1`);
  }

  return redirect(
    `${redirectTo}?created=1&new_token=${encodeURIComponent(token)}`,
  );
};
