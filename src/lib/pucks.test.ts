import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { hmacSha256Hex, normalizeDeviceId, normalizeSecretHex } from "./pucks";

describe("puck crypto helpers", () => {
  it("normalizes device id and secret", () => {
    expect(normalizeDeviceId("AABBCCDDEEFF00112233445566778899")).toBe(
      "aabbccddeeff00112233445566778899",
    );
    expect(normalizeDeviceId("short")).toBeNull();
    expect(normalizeSecretHex("00".repeat(32))).toHaveLength(64);
    expect(normalizeSecretHex("00".repeat(16))).toBeNull();
  });

  it("matches Node HMAC-SHA256 over raw nonce bytes", async () => {
    const secret = "11".repeat(32);
    const nonce = "aabbccddeeff00112233445566778899";
    const expectHex = createHmac("sha256", Buffer.from(secret, "hex"))
      .update(Buffer.from(nonce, "hex"))
      .digest("hex");
    await expect(hmacSha256Hex(secret, nonce)).resolves.toBe(expectHex);
  });
});
