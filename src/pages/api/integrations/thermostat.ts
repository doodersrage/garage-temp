import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { getOrCreateHouseholdForUser, getUserHouseholdRole, canEditHousehold } from "../../../lib/households";
import { buildSiteUrl } from "../../../lib/siteUrl";
import { listConnectionsForHousehold } from "../../../lib/thermostatConnections";
import { fetchThermostatContext } from "../../../lib/thermostatCorrelation";
import {
  isEcobeeOAuthConfigured,
  isNestOAuthConfigured,
} from "../../../lib/thermostatOAuth";

export const GET: APIRoute = async ({ cookies, request, site }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entitlements = await getUserEntitlements(user.id);
  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  const siteUrl = buildSiteUrl(request, site);

  const configured = {
    nest: isNestOAuthConfigured(),
    ecobee: isEcobeeOAuthConfigured(),
  };

  if (!household.householdId) {
    return new Response(
      JSON.stringify({
        can_use: entitlements.canUseThermostatIntegration,
        configured,
        connections: [],
        connect_urls: {
          ...(configured.nest
            ? { nest: `${siteUrl}/api/integrations/nest/connect` }
            : {}),
          ...(configured.ecobee
            ? { ecobee: `${siteUrl}/api/integrations/ecobee/connect` }
            : {}),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const role = await getUserHouseholdRole(user.id, household.householdId);
  const canConnect = entitlements.canUseThermostatIntegration && canEditHousehold(role);

  const connections = await listConnectionsForHousehold(household.householdId);
  const snapshots = await Promise.all(
    connections.map(async (connection) => ({
      provider: connection.provider,
      connected_at: connection.createdAt,
      snapshot: await fetchThermostatContext(household.householdId!, connection.provider),
    })),
  );

  return new Response(
    JSON.stringify({
      can_use: entitlements.canUseThermostatIntegration,
      can_connect: canConnect,
      configured,
      connections: snapshots.map((entry) => ({
        provider: entry.provider,
        connected_at: entry.connected_at,
        ambient_temp_f: entry.snapshot?.ambientTempF ?? null,
        heat_setpoint_f: entry.snapshot?.heatSetpointF ?? null,
        hvac_mode: entry.snapshot?.hvacMode ?? null,
      })),
      connect_urls: canConnect
        ? {
            ...(configured.nest
              ? { nest: `${siteUrl}/api/integrations/nest/connect?mobile=1` }
              : {}),
            ...(configured.ecobee
              ? { ecobee: `${siteUrl}/api/integrations/ecobee/connect?mobile=1` }
              : {}),
          }
        : null,
      disconnect_urls: canConnect
        ? {
            ...(configured.nest
              ? { nest: `${siteUrl}/api/integrations/nest/disconnect` }
              : {}),
            ...(configured.ecobee
              ? { ecobee: `${siteUrl}/api/integrations/ecobee/disconnect` }
              : {}),
          }
        : null,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};
