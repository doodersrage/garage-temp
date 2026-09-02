import { encryptIngestKeyForStorage } from "./ingestKeyVault";
import { updateDeviceMeta } from "./devices";

export async function persistEncryptedIngestKey(
  deviceId: string,
  rawKey: string,
): Promise<void> {
  const ingest_key_enc = await encryptIngestKeyForStorage(rawKey);
  if (ingest_key_enc) {
    await updateDeviceMeta(deviceId, { ingest_key_enc });
  }
}
