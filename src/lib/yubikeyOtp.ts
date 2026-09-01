import { getRuntimeEnv } from "./runtimeEnv";

const MODHEX_CHAR = "[cbdefghijklnrtuv]";
const OTP_PATTERN = new RegExp(`^${MODHEX_CHAR}{44}$`, "i");
const PUBLIC_ID_PATTERN = new RegExp(`^${MODHEX_CHAR}{12}$`, "i");

export const YUBIKEY_OTP_METADATA_KEY = "yubikey_otp_public_ids";

export const YUBICO_VERIFY_ENDPOINTS = [
  "https://api.yubico.com/ws/4/verify",
  "https://api2.yubico.com/ws/4/verify",
  "https://api3.yubico.com/ws/4/verify",
  "https://api4.yubico.com/ws/4/verify",
  "https://api5.yubico.com/ws/4/verify",
] as const;

export type YubiKeyOtpConfig = {
  clientId: string;
  apiKeyBase64: string;
};

export type YubiKeyOtpVerifyResult =
  | { ok: true; publicId: string }
  | { ok: false; error: string };

export function isYubiKeyOtpConfigured(): boolean {
  return getYubiKeyOtpConfig() !== null;
}

export function getYubiKeyOtpConfig(): YubiKeyOtpConfig | null {
  const clientId = getRuntimeEnv("YUBICO_CLIENT_ID");
  const apiKeyBase64 = getRuntimeEnv("YUBICO_API_KEY");
  if (!clientId || !apiKeyBase64) return null;
  return { clientId, apiKeyBase64 };
}

export function normalizeYubiKeyOtp(raw: string): string | null {
  const otp = raw.trim().toLowerCase();
  if (!OTP_PATTERN.test(otp)) return null;
  return otp;
}

export function getYubiKeyPublicId(otp: string): string {
  return otp.slice(0, 12).toLowerCase();
}

export function getYubiKeyPublicIdsFromUser(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): string[] {
  const raw = user?.user_metadata?.[YUBIKEY_OTP_METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (id): id is string =>
        typeof id === "string" && PUBLIC_ID_PATTERN.test(id.trim()),
    )
    .map((id) => id.trim().toLowerCase());
}

export function userHasYubiKeyOtpEnrolled(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): boolean {
  return getYubiKeyPublicIdsFromUser(user).length > 0;
}

export function buildYubiKeyMetadataUpdate(
  existing: string[],
  publicId: string,
): Record<string, string[]> {
  const normalized = publicId.toLowerCase();
  if (existing.includes(normalized)) {
    return { [YUBIKEY_OTP_METADATA_KEY]: existing };
  }
  return { [YUBIKEY_OTP_METADATA_KEY]: [...existing, normalized] };
}

export function buildYubiKeyMetadataRemove(
  existing: string[],
  publicId: string,
): Record<string, string[]> {
  const normalized = publicId.toLowerCase();
  return {
    [YUBIKEY_OTP_METADATA_KEY]: existing.filter((id) => id !== normalized),
  };
}

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeApiKey(base64Key: string): ArrayBuffer {
  const normalized = base64Key.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function hmacSha1(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function parseYubiCloudBody(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return map;
}

function buildSignString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

async function signRequest(
  params: Record<string, string>,
  apiKeyBase64: string,
): Promise<string> {
  const key = decodeApiKey(apiKeyBase64);
  const message = buildSignString(params);
  const signature = await hmacSha1(key, message);
  return base64Encode(signature);
}

async function verifyResponseSignature(
  fields: Map<string, string>,
  apiKeyBase64: string,
): Promise<boolean> {
  const signature = fields.get("h");
  if (!signature) return false;

  const params: Record<string, string> = {};
  for (const [key, value] of fields) {
    if (key === "h") continue;
    params[key] = value;
  }

  const key = decodeApiKey(apiKeyBase64);
  const expected = await hmacSha1(key, buildSignString(params));
  const expectedB64 = base64Encode(expected);
  return expectedB64 === signature;
}

export async function verifyYubiKeyOtpWithYubiCloud(
  rawOtp: string,
  config: YubiKeyOtpConfig = getYubiKeyOtpConfig() ?? { clientId: "", apiKeyBase64: "" },
): Promise<YubiKeyOtpVerifyResult> {
  if (!config.clientId || !config.apiKeyBase64) {
    return { ok: false, error: "YubiKey OTP verification is not configured" };
  }

  const otp = normalizeYubiKeyOtp(rawOtp);
  if (!otp) {
    return { ok: false, error: "Enter a valid 44-character YubiKey OTP" };
  }

  const nonce = createNonce();
  const params: Record<string, string> = {
    id: config.clientId,
    nonce,
    otp,
    timestamp: "1",
  };
  const signature = await signRequest(params, config.apiKeyBase64);
  const query = new URLSearchParams({ ...params, h: signature });

  let lastError = "YubiCloud verification failed";
  for (const endpoint of YUBICO_VERIFY_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?${query.toString()}`, {
        method: "GET",
        headers: { "User-Agent": "ThermalTrace/1.0" },
      });
      const body = await response.text();
      const fields = parseYubiCloudBody(body);

      if (!(await verifyResponseSignature(fields, config.apiKeyBase64))) {
        lastError = "Invalid YubiCloud response signature";
        continue;
      }

      const status = fields.get("status") ?? "";
      if (status !== "OK") {
        lastError =
          status === "REPLAYED_OTP"
            ? "That YubiKey OTP was already used"
            : status === "BAD_OTP"
              ? "Invalid YubiKey OTP"
              : `YubiCloud rejected OTP (${status || "unknown"})`;
        continue;
      }

      if (fields.get("otp")?.toLowerCase() !== otp) {
        lastError = "YubiCloud OTP mismatch";
        continue;
      }
      if (fields.get("nonce") !== nonce) {
        lastError = "YubiCloud nonce mismatch";
        continue;
      }

      return { ok: true, publicId: getYubiKeyPublicId(otp) };
    } catch {
      lastError = "Could not reach YubiCloud";
    }
  }

  return { ok: false, error: lastError };
}
