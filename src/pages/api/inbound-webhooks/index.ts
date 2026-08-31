import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import {
  getUserHouseholdId,
  getUserHouseholdRole,
  canManageHousehold,
} from "../../../lib/households";
import {
  createInboundWebhook,
  listInboundWebhooks,
  revokeInboundWebhook,
} from "../../../lib/inboundWebhooks";
import { getUserEntitlements } from "../../../lib/entitlements";
import { formRedirectPath } from "../../../lib/siteUrl";
import {
  FLASH_INBOUND_SIGNING,
  FLASH_INBOUND_TOKEN,
  setSecretFlash,
} from "../../../lib/secretFlash";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const householdId = await getUserHouseholdId(user.id);
  if (!householdId) {
    return new Response(JSON.stringify({ webhooks: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { webhooks } = await listInboundWebhooks(householdId);
  return new Response(JSON.stringify({ webhooks }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUseOutboundWebhook) {
    return redirect("/dashboard/share?inbound_error=pro");
  }

  const householdId = await getUserHouseholdId(user.id);
  if (!householdId) {
    return redirect("/dashboard/share?inbound_error=1");
  }

  const role = await getUserHouseholdRole(user.id, householdId);
  if (!canManageHousehold(role)) {
    return redirect("/dashboard/share?inbound_error=manager_required");
  }

  const formData = await request.formData();
  const action = formData.get("action")?.toString();
  const redirectTo = formRedirectPath(formData, "/dashboard/share");

  if (action === "create") {
    const name = formData.get("name")?.toString() || "Inbound webhook";
    const { token, signingSecret, error } = await createInboundWebhook(householdId, user.id, name);
    if (error || !token) {
      return redirect(`${redirectTo}?inbound_error=1`);
    }
    setSecretFlash(cookies, FLASH_INBOUND_TOKEN, token);
    if (signingSecret) {
      setSecretFlash(cookies, FLASH_INBOUND_SIGNING, signingSecret);
    }
    return redirect(`${redirectTo}?inbound_created=1`);
  }

  if (action === "revoke") {
    const webhookId = formData.get("webhook_id")?.toString();
    if (webhookId) {
      await revokeInboundWebhook(webhookId, householdId);
    }
    return redirect(`${redirectTo}?inbound_revoked=1`);
  }

  return redirect(redirectTo);
};
