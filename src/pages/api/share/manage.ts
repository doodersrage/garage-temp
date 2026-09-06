import type { APIRoute } from "astro";
import { getAuthFromRequest } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { getUserEntitlements } from "../../../lib/entitlements";
import { createServerClient } from "../../../lib/supabase";
import {
  redirectUnlessManager,
  requireHouseholdManager,
} from "../../../lib/householdAuth";
import { recordHouseholdActivity } from "../../../lib/householdActivity";
import { formRedirectPath } from "../../../lib/siteUrl";
import { FLASH_SHARE_TOKEN, setSecretFlash } from "../../../lib/secretFlash";

const FAMILY_MAX_LIVE_LINKS = 1;
const FAMILY_DEFAULT_EXPIRES_DAYS = 7;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function maskShareLinkToken(token: string) {
  return {
    token_preview: token.slice(-4),
  };
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const { user } = await getAuthFromRequest(request, cookies);
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

  const manager = await requireHouseholdManager(user.id);
  const canManage = manager.ok;

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

  const links = (data ?? []).map((link) => {
    if (canManage) return link;
    const { token, ...rest } = link;
    return { ...rest, ...maskShareLinkToken(token) };
  });

  return new Response(JSON.stringify({ links }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromRequest(request, cookies);
  if (!user) {
    return redirect("/signin");
  }

  const entitlements = await getUserEntitlements(user.id);
  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/share");
  const action = formData.get("action")?.toString() ?? "create";

  const manager = await requireHouseholdManager(user.id);
  const blocked = redirectUnlessManager(manager, redirectTo, redirect);
  if (blocked) return blocked;

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (!household.householdId) {
    return redirect(`${redirectTo}?error=1`);
  }

  const supabase = createServerClient();

  if (action === "revoke") {
    if (!entitlements.canCreateShareLinks && !entitlements.canCreateFamilyShareLink) {
      return redirect(`${redirectTo}?error=pro_required`);
    }
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

  const familyOnly =
    !entitlements.canCreateShareLinks && entitlements.canCreateFamilyShareLink;
  if (!entitlements.canCreateShareLinks && !entitlements.canCreateFamilyShareLink) {
    return redirect(`${redirectTo}?error=pro_required`);
  }

  const scopeRaw = formData.get("scope")?.toString() ?? "live";
  let scope =
    scopeRaw === "history"
      ? "history"
      : scopeRaw === "metrics"
        ? "metrics"
        : "live";
  let label = formData.get("label")?.toString().trim() || null;
  let expiresDays = Number(formData.get("expires_days") ?? 0);

  if (familyOnly || formData.get("family_quick") === "1") {
    scope = "live";
    label = label || "Family live view";
    if (!(expiresDays > 0)) {
      expiresDays = FAMILY_DEFAULT_EXPIRES_DAYS;
    }
    // Cap free/member family links at one live view.
    if (familyOnly) {
      const { count } = await supabase
        .from("share_links")
        .select("id", { count: "exact", head: true })
        .eq("household_id", household.householdId)
        .eq("scope", "live");
      if ((count ?? 0) >= FAMILY_MAX_LIVE_LINKS) {
        return redirect(`${redirectTo}?error=family_limit`);
      }
      // Free/member: never allow never-expire or non-live.
      expiresDays = Math.min(Math.max(expiresDays, 1), 30);
    }
  } else if (!entitlements.canCreateShareLinks) {
    return redirect(`${redirectTo}?error=pro_required`);
  }

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

  await recordHouseholdActivity({
    householdId: household.householdId,
    userId: user.id,
    action: "share_link_created",
    detail: scope,
  });

  setSecretFlash(cookies, FLASH_SHARE_TOKEN, token);
  return redirect(`${redirectTo}?created=1`);
};
