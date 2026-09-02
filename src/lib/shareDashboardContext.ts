import type { AstroCookies } from "astro";
import { getAuthFromCookies } from "./auth";
import { getOrCreateHouseholdForUser, getUserHouseholdRole, canManageHousehold } from "./households";
import { getUserEntitlements } from "./entitlements";
import { createServerClient } from "./supabase";
import { getSiteUrl } from "./stripe";
import { listHouseholdApiKeys } from "./apiKeys";
import { listInboundWebhooks } from "./inboundWebhooks";
import { listStatusPageTokens } from "./statusPage";
import { listIngestStatsForHousehold } from "./ingestStats";
import { listHouseholdActivity } from "./householdActivity";
import { listRecentWebhookDeliveries } from "./webhookDeliveries";
import {
  FLASH_API_KEY,
  FLASH_INBOUND_SIGNING,
  FLASH_INBOUND_TOKEN,
  FLASH_SHARE_TOKEN,
  FLASH_STATUS_TOKEN,
  consumeSecretFlash,
} from "./secretFlash";

export async function loadShareDashboardContext(
  cookies: AstroCookies,
  request: Request,
  url: URL,
) {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return { redirect: "/signin" as const };
  }

  const inboundToken = consumeSecretFlash(cookies, FLASH_INBOUND_TOKEN);
  const inboundSigningSecret = consumeSecretFlash(cookies, FLASH_INBOUND_SIGNING);

  const entitlements = await getUserEntitlements(user.id);
  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  const supabase = createServerClient();
  const { data: links } = household.householdId
    ? await supabase
        .from("share_links")
        .select("id, token, scope, label, expires_at, created_at")
        .eq("household_id", household.householdId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const apiKeys = household.householdId
    ? await listHouseholdApiKeys(household.householdId)
    : [];

  const inboundWebhooks = household.householdId
    ? (await listInboundWebhooks(household.householdId)).webhooks
    : [];

  const statusPages = household.householdId
    ? await listStatusPageTokens(household.householdId)
    : [];

  const ingestStats = household.householdId
    ? await listIngestStatsForHousehold(household.householdId, 7)
    : [];

  const activity = household.householdId
    ? await listHouseholdActivity(household.householdId, 15)
    : [];

  const householdRole = household.householdId
    ? await getUserHouseholdRole(user.id, household.householdId)
    : null;
  const canManage = canManageHousehold(householdRole);

  const siteUrl = getSiteUrl(request);
  const webhookDeliveries = await listRecentWebhookDeliveries(user.id, 15);
  const newToken = consumeSecretFlash(cookies, FLASH_SHARE_TOKEN);
  const statusToken = consumeSecretFlash(cookies, FLASH_STATUS_TOKEN);
  const newHref = newToken ? `${siteUrl}/share/${newToken}` : null;
  const newApiKey = consumeSecretFlash(cookies, FLASH_API_KEY);

  const notice = url.searchParams.get("created")
    ? "Share link created — copy it below to send to family."
    : url.searchParams.get("revoked")
      ? "Share link revoked."
      : url.searchParams.get("api_key_created")
        ? "API key created — copy it now; it will not be shown again."
        : url.searchParams.get("api_key_revoked")
          ? "API key revoked."
          : url.searchParams.get("status_created")
            ? "Status page created — copy the link below."
            : url.searchParams.get("status_revoked")
              ? "Status page revoked."
              : url.searchParams.get("error") === "family_limit"
                ? "You already have a family live link. Revoke it first, or upgrade to Pro for more."
                : url.searchParams.get("error") === "pro_required"
                  ? "That option needs Pro. You can still create one family live link on Free."
                  : url.searchParams.get("error")
                    ? "Could not update share links."
                    : null;
  const noticeIsError = Boolean(url.searchParams.get("error"));

  return {
    redirect: null,
    user,
    entitlements,
    household,
    links: links ?? [],
    apiKeys,
    inboundWebhooks,
    statusPages,
    ingestStats,
    activity,
    canManage,
    siteUrl,
    webhookDeliveries,
    newToken,
    statusToken,
    newHref,
    newApiKey,
    inboundToken,
    inboundSigningSecret,
    notice,
    noticeIsError,
  };
}

export type ShareDashboardContext = Exclude<
  Awaited<ReturnType<typeof loadShareDashboardContext>>,
  { redirect: string }
>;
