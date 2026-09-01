import type { WebAuthnRp } from "./webauthnRp";

function supabaseAuthUrl(): string {
  return `${import.meta.env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1`;
}

function supabaseHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

type SupabaseErrorBody = {
  error?: string;
  error_description?: string;
  msg?: string;
};

function formatSupabaseError(body: SupabaseErrorBody | null, status: number): string {
  return (
    body?.error_description ??
    body?.msg ??
    body?.error ??
    `Supabase MFA request failed (${status})`
  );
}

export type WebAuthnCeremonyType = "create" | "request";

export type WebAuthnChallengePayload = {
  challengeId: string;
  factorId: string;
  ceremonyType: WebAuthnCeremonyType;
  publicKey: Record<string, unknown>;
};

type WebAuthnChallengeResponse = {
  id?: string;
  type?: string;
  webauthn?: {
    type?: WebAuthnCeremonyType;
    credential_options?: {
      publicKey?: Record<string, unknown>;
    };
  };
};

export type WebAuthnCredentialResponse = Record<string, unknown>;

export type WebAuthnVerifyResult = {
  accessToken: string;
  refreshToken: string;
};

export async function enrollWebAuthnFactor(
  accessToken: string,
  friendlyName: string,
): Promise<{ factorId: string; error: string | null }> {
  const res = await fetch(`${supabaseAuthUrl()}/factors`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      factor_type: "webauthn",
      friendly_name: friendlyName,
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | ({ id?: string } & SupabaseErrorBody)
    | null;

  if (!res.ok) {
    return { factorId: "", error: formatSupabaseError(body, res.status) };
  }

  const factorId = body?.id?.trim();
  if (!factorId) {
    return { factorId: "", error: "Enrollment did not return a factor id" };
  }

  return { factorId, error: null };
}

export async function challengeWebAuthnFactor(
  accessToken: string,
  factorId: string,
  rp: WebAuthnRp,
): Promise<{ challenge: WebAuthnChallengePayload | null; error: string | null }> {
  const res = await fetch(`${supabaseAuthUrl()}/factors/${factorId}/challenge`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      webauthn: {
        rpId: rp.rpId,
        rpOrigins: rp.rpOrigins,
      },
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | (WebAuthnChallengeResponse & SupabaseErrorBody)
    | null;

  if (!res.ok) {
    return { challenge: null, error: formatSupabaseError(body, res.status) };
  }

  const ceremonyType = body?.webauthn?.type;
  const publicKey = body?.webauthn?.credential_options?.publicKey;
  const challengeId = body?.id?.trim();

  if (
    !challengeId ||
    (ceremonyType !== "create" && ceremonyType !== "request") ||
    !publicKey
  ) {
    return { challenge: null, error: "Invalid WebAuthn challenge from auth server" };
  }

  return {
    challenge: {
      challengeId,
      factorId,
      ceremonyType,
      publicKey,
    },
    error: null,
  };
}

export async function verifyWebAuthnFactor(
  accessToken: string,
  factorId: string,
  challengeId: string,
  ceremonyType: WebAuthnCeremonyType,
  credentialResponse: WebAuthnCredentialResponse,
  rp: WebAuthnRp,
): Promise<{ result: WebAuthnVerifyResult | null; error: string | null }> {
  const res = await fetch(`${supabaseAuthUrl()}/factors/${factorId}/verify`, {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify({
      challenge_id: challengeId,
      webauthn: {
        type: ceremonyType,
        rpId: rp.rpId,
        rpOrigins: rp.rpOrigins,
        credential_response: credentialResponse,
      },
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | ({
        access_token?: string;
        refresh_token?: string;
      } & SupabaseErrorBody)
    | null;

  if (!res.ok) {
    return { result: null, error: formatSupabaseError(body, res.status) };
  }

  const accessTokenOut = body?.access_token?.trim();
  const refreshTokenOut = body?.refresh_token?.trim();
  if (!accessTokenOut || !refreshTokenOut) {
    return { result: null, error: "Verification succeeded but no session was returned" };
  }

  return {
    result: {
      accessToken: accessTokenOut,
      refreshToken: refreshTokenOut,
    },
    error: null,
  };
}
