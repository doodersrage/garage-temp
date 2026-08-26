import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import {
  getUserHouseholdId,
  getUserHouseholdRole,
  canEditHousehold,
} from "../../../lib/households";
import {
  createInboundWebhook,
  listInboundWebhooks,
  revokeInboundWebhook,
} from "../../../lib/inboundWebhooks";
import { getUserEntitlements } from "../../../lib/entitlements";

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
  if (!canEditHousehold(role)) {
    return redirect("/dashboard/share?inbound_error=viewer");
  }

  const formData = await request.formData();
  const action = formData.get("action")?.toString();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/share";

  if (action === "create") {
    const name = formData.get("name")?.toString() || "Inbound webhook";
    const { token, error } = await createInboundWebhook(householdId, user.id, name);
    if (error || !token) {
      return redirect(`${redirectTo}?inbound_error=1`);
    }
    const params = new URLSearchParams({ inbound_created: "1", inbound_token: token });
    return redirect(`${redirectTo}?${params.toString()}`);
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
