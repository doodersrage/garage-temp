import { describe, expect, it, vi } from "vitest";

vi.mock("./runtimeEnv", () => ({
  getRuntimeEnv: (key: string) =>
    key === "INGEST_KEY_ENCRYPTION_SECRET" ? "test-vault-secret-32chars-minimum" : undefined,
}));

import {
  decryptStoredIngestKey,
  encryptIngestKeyForStorage,
} from "./ingestKeyVault";

describe("ingestKeyVault", () => {
  it("round-trips ingest keys", async () => {
    const encrypted = await encryptIngestKeyForStorage("abc123devicekey");
    expect(encrypted).toBeTruthy();
    const plain = await decryptStoredIngestKey(encrypted!);
    expect(plain).toBe("abc123devicekey");
  });
});
