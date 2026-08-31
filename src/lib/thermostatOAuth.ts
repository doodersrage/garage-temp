/**
 * Nest / Ecobee OAuth: per-household connections (not a single global secret --
 * see thermostatConnections.ts for the stored, per-household refresh/access
 * tokens this module reads and writes).
 *
 * Registering an OAuth app with each provider is an external, one-time setup
 * step only the site operator can do:
 *  - Nest: Google's Device Access Console (one-time $5 fee) + a Google Cloud
 *    OAuth client. Needs NEST_CLIENT_ID, NEST_CLIENT_SECRET, NEST_PROJECT_ID
 *    (the Device Access project id, distinct from the OAuth client id).
 *  - Ecobee: free developer registration. Needs ECOBEE_CLIENT_ID (Ecobee's
 *    token endpoint does not use a client secret).
 * All four are read as Worker secrets via getRuntimeEnv.
 */
import { getRuntimeEnv } from "./runtimeEnv";

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
};

export async function refreshNestTokens(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<OAuthTokens | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

export async function refreshEcobeeTokens(
  clientId: string,
  refreshToken: string,
): Promise<OAuthTokens | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    });
    const res = await fetch("https://api.ecobee.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

export async function exchangeNestCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<OAuthTokens | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token || !data.refresh_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

export async function exchangeEcobeeCode(
  clientId: string,
  code: string,
  redirectUri: string,
): Promise<OAuthTokens | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
    });
    const res = await fetch("https://api.ecobee.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token || !data.refresh_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch {
    return null;
  }
}

export function buildNestAuthorizeUrl(state: string, redirectUri: string): string | null {
  const clientId = getRuntimeEnv("NEST_CLIENT_ID");
  const projectId = getRuntimeEnv("NEST_PROJECT_ID");
  if (!clientId || !projectId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/sdm.service",
    state,
  });
  return `https://nestservices.google.com/partnerconnections/${projectId}/auth?${params.toString()}`;
}

export function buildEcobeeAuthorizeUrl(state: string, redirectUri: string): string | null {
  const clientId = getRuntimeEnv("ECOBEE_CLIENT_ID");
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "smartRead",
    state,
  });
  return `https://api.ecobee.com/authorize?${params.toString()}`;
}

/**
 * A stored access token is treated as expired slightly early so a request
 * never races a token that dies mid-flight.
 */
const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000;

/**
 * Returns a live access token for a household's connection, refreshing (and
 * persisting the refreshed tokens) if the stored one is missing or expiring
 * soon. Returns null if there's no connection, or the refresh itself fails
 * (e.g. the user revoked access on the provider's side) -- callers should
 * treat null as "needs to reconnect", not retry in a loop.
 */
export async function resolveAccessTokenForHousehold(
  householdId: string,
  provider: "nest" | "ecobee",
): Promise<string | null> {
  const { getConnectionForHousehold, updateTokensAfterRefresh } = await import(
    "./thermostatConnections"
  );
  const connection = await getConnectionForHousehold(householdId, provider);
  if (!connection) return null;

  const expiresAtMs = connection.accessTokenExpiresAt
    ? Date.parse(connection.accessTokenExpiresAt)
    : NaN;
  const stillFresh =
    connection.accessToken &&
    Number.isFinite(expiresAtMs) &&
    expiresAtMs - Date.now() > EXPIRY_SAFETY_MARGIN_MS;
  if (stillFresh) return connection.accessToken;

  const tokens =
    provider === "nest"
      ? await refreshNestTokensForHousehold(connection.refreshToken)
      : await refreshEcobeeTokensForHousehold(connection.refreshToken);
  if (!tokens) return null;

  await updateTokensAfterRefresh(householdId, provider, tokens);
  return tokens.accessToken;
}

async function refreshNestTokensForHousehold(
  refreshToken: string,
): Promise<OAuthTokens | null> {
  const clientId = getRuntimeEnv("NEST_CLIENT_ID");
  const clientSecret = getRuntimeEnv("NEST_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return refreshNestTokens(clientId, clientSecret, refreshToken);
}

async function refreshEcobeeTokensForHousehold(
  refreshToken: string,
): Promise<OAuthTokens | null> {
  const clientId = getRuntimeEnv("ECOBEE_CLIENT_ID");
  if (!clientId) return null;
  return refreshEcobeeTokens(clientId, refreshToken);
}
