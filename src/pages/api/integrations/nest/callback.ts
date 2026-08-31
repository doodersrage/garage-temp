import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import {
  requireHouseholdManager,
  redirectUnlessManager,
  householdManagerCtx,
} from "../../../../lib/householdAuth";
import { getUserEntitlements } from "../../../../lib/entitlements";
import { exchangeNestCode } from "../../../../lib/thermostatOAuth";
import { getRuntimeEnv } from "../../../../lib/runtimeEnv";
import { saveConnection } from "../../../../lib/thermostatConnections";
import { buildSiteUrl, THERMOSTAT_OAUTH_STATE_COOKIE } from "../../../../lib/siteUrl";

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const expectedState = cookies.get(THERMOSTAT_OAUTH_STATE_COOKIE)?.value;
  cookies.delete(THERMOSTAT_OAUTH_STATE_COOKIE, { path: "/" });
  const state = url.searchParams.get("state");
  if (!state || !expectedState || state !== expectedState) {
    return redirect("/dashboard/temperature?thermostat_error=state_mismatch");
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return redirect("/dashboard/temperature?thermostat_error=denied");
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUseThermostatIntegration) {
    return redirect("/dashboard/plans?upgrade=thermostat");
  }

  const manager = await requireHouseholdManager(user.id);
  const blocked = redirectUnlessManager(manager, "/dashboard/temperature", redirect);
  if (blocked) return blocked;

  const clientId = getRuntimeEnv("NEST_CLIENT_ID");
  const clientSecret = getRuntimeEnv("NEST_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return redirect("/dashboard/temperature?thermostat_error=not_configured");
  }

  const redirectUri = `${buildSiteUrl(request)}/api/integrations/nest/callback`;
  const tokens = await exchangeNestCode(clientId, clientSecret, code, redirectUri);
  if (!tokens) {
    return redirect("/dashboard/temperature?thermostat_error=exchange_failed");
  }

  const ctx = householdManagerCtx(manager);
  const { error } = await saveConnection({
    householdId: ctx.householdId,
    provider: "nest",
    refreshToken: tokens.refreshToken,
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: new Date(tokens.expiresAtMs).toISOString(),
    connectedBy: user.id,
  });
  if (error) {
    return redirect("/dashboard/temperature?thermostat_error=save_failed");
  }

  return redirect("/dashboard/temperature?thermostat_connected=nest");
};
