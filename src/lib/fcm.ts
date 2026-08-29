import { createAdminClient } from "./supabase";

export type FcmPayload = {
  title: string;
  body: string;
};

export type FcmDeliveryResult = {
  delivered: number;
  failed: number;
  skippedReason: string | null;
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let cachedAccessToken: { value: string; expiresAtMs: number } | null = null;

export function isFcmConfigured(): boolean {
  return Boolean(resolveServiceAccount());
}

function resolveServiceAccount(): ServiceAccount | null {
  const jsonRaw = import.meta.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as Partial<ServiceAccount>;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key: normalizePem(parsed.private_key),
        };
      }
    } catch (error) {
      console.error("Invalid FCM_SERVICE_ACCOUNT_JSON:", error);
    }
  }

  const projectId = import.meta.env.FCM_PROJECT_ID?.trim();
  const clientEmail = import.meta.env.FCM_CLIENT_EMAIL?.trim();
  const privateKey = import.meta.env.FCM_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: normalizePem(privateKey),
    };
  }
  return null;
}

function normalizePem(key: string): string {
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function base64Url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > now + 60_000) {
    return cachedAccessToken.value;
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const iat = Math.floor(now / 1000);
  const claim = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64Url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    throw new Error(`FCM OAuth failed (${tokenRes.status}): ${text}`);
  }

  const json = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("FCM OAuth response missing access_token");
  }

  cachedAccessToken = {
    value: json.access_token,
    expiresAtMs: now + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

export function isStaleFcmError(status: number, errorCode?: string): boolean {
  if (status === 404) return true;
  return (
    errorCode === "NOT_FOUND" ||
    errorCode === "UNREGISTERED" ||
    errorCode === "INVALID_ARGUMENT"
  );
}

export async function sendFcmToUser(
  userId: string,
  payload: FcmPayload,
): Promise<FcmDeliveryResult> {
  const account = resolveServiceAccount();
  if (!account) {
    return { delivered: 0, failed: 0, skippedReason: "fcm_not_configured" };
  }

  const supabase = createAdminClient();
  const { data: tokens, error } = await supabase
    .from("fcm_device_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load FCM tokens:", error.message);
    return { delivered: 0, failed: 0, skippedReason: "fcm_load_failed" };
  }

  if (!tokens || tokens.length === 0) {
    return { delivered: 0, failed: 0, skippedReason: "fcm_no_token" };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(account);
  } catch (err) {
    console.error("FCM access token error:", err);
    return { delivered: 0, failed: tokens.length, skippedReason: "fcm_auth_failed" };
  }

  let delivered = 0;
  let failed = 0;
  const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;

  for (const row of tokens) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: {
              title: payload.title,
              body: payload.body,
              click_action: "OPEN_DASHBOARD",
            },
            android: {
              priority: "HIGH",
              notification: {
                channel_id: "thermaltrace_alerts",
                click_action: "OPEN_DASHBOARD",
              },
            },
          },
        }),
      });

      if (response.ok) {
        delivered += 1;
        continue;
      }

      failed += 1;
      const errBody = await response.text().catch(() => "");
      console.error("FCM send rejected:", response.status, errBody);

      let errorCode: string | undefined;
      try {
        errorCode = (JSON.parse(errBody) as { error?: { details?: Array<{ errorCode?: string }> } })
          .error?.details?.find((d) => d.errorCode)?.errorCode;
      } catch {
        /* ignore */
      }

      if (isStaleFcmError(response.status, errorCode)) {
        await supabase
          .from("fcm_device_tokens")
          .delete()
          .eq("user_id", userId)
          .eq("token", row.token);
      }
    } catch (err) {
      failed += 1;
      console.error("FCM send failed:", err);
    }
  }

  if (delivered > 0) {
    return { delivered, failed, skippedReason: null };
  }

  return {
    delivered: 0,
    failed,
    skippedReason: failed > 0 ? "fcm_delivery_failed" : "fcm_no_token",
  };
}

export async function countFcmTokens(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("fcm_device_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to count FCM tokens:", error.message);
    return 0;
  }
  return count ?? 0;
}
