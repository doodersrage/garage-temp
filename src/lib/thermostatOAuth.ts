/**
 * OAuth token refresh helpers for Nest / Ecobee (manual token paste today).
 * Register OAuth apps with each provider, then store refresh tokens in Worker secrets.
 */

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

export async function resolveNestAccessToken(): Promise<string | null> {
  const staticToken = import.meta.env.NEST_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;

  const refresh = import.meta.env.NEST_REFRESH_TOKEN?.trim();
  const clientId = import.meta.env.NEST_CLIENT_ID?.trim();
  const clientSecret = import.meta.env.NEST_CLIENT_SECRET?.trim();
  if (!refresh || !clientId || !clientSecret) return null;

  const tokens = await refreshNestTokens(clientId, clientSecret, refresh);
  return tokens?.accessToken ?? null;
}

export async function resolveEcobeeAccessToken(): Promise<string | null> {
  const staticToken = import.meta.env.ECOBEE_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;

  const refresh = import.meta.env.ECOBEE_REFRESH_TOKEN?.trim();
  const clientId = import.meta.env.ECOBEE_CLIENT_ID?.trim();
  if (!refresh || !clientId) return null;

  const tokens = await refreshEcobeeTokens(clientId, refresh);
  return tokens?.accessToken ?? null;
}
