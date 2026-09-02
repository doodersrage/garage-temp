import { getRuntimeEnv } from "./runtimeEnv";

const ALGO = "AES-GCM";
const IV_BYTES = 12;

async function vaultKey(): Promise<CryptoKey | null> {
  const secret = getRuntimeEnv("INGEST_KEY_ENCRYPTION_SECRET")?.trim();
  if (!secret || secret.length < 16) return null;

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: ALGO }, false, ["encrypt", "decrypt"]);
}

/** Encrypt a push ingest key for household-scoped reveal (stored in device.meta). */
export async function encryptIngestKeyForStorage(plaintext: string): Promise<string | null> {
  const key = await vaultKey();
  if (!key) return null;

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...packed));
}

export async function decryptStoredIngestKey(stored: string): Promise<string | null> {
  const key = await vaultKey();
  if (!key) return null;

  try {
    const packed = Uint8Array.from(atob(stored), (char) => char.charCodeAt(0));
    if (packed.length <= IV_BYTES) return null;
    const iv = packed.slice(0, IV_BYTES);
    const cipher = packed.slice(IV_BYTES);
    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export function ingestKeyVaultConfigured(): boolean {
  const secret = getRuntimeEnv("INGEST_KEY_ENCRYPTION_SECRET")?.trim();
  return Boolean(secret && secret.length >= 16);
}
