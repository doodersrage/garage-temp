import { describe, expect, it } from "vitest";
import { randomSigningSecret, verifyInboundSignature } from "./inboundSigning";

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("verifyInboundSignature", () => {
  it("accepts a correctly signed body", async () => {
    const secret = "shh-its-a-secret";
    const body = '{"action":"snooze","hours":12}';
    const sig = await hmacHex(secret, body);
    expect(await verifyInboundSignature(secret, body, `sha256=${sig}`)).toBe(true);
  });

  it("rejects a body with a mismatched signature", async () => {
    const secret = "shh-its-a-secret";
    const body = '{"action":"snooze","hours":12}';
    const sig = await hmacHex(secret, body);
    expect(
      await verifyInboundSignature(secret, body + "tampered", `sha256=${sig}`),
    ).toBe(false);
  });

  it("rejects when signed with the wrong secret", async () => {
    const body = '{"action":"vacation","days":3}';
    const sig = await hmacHex("wrong-secret", body);
    expect(
      await verifyInboundSignature("shh-its-a-secret", body, `sha256=${sig}`),
    ).toBe(false);
  });

  it("rejects a missing signature header when a secret is configured", async () => {
    expect(
      await verifyInboundSignature("shh-its-a-secret", "{}", null),
    ).toBe(false);
  });

  it("rejects when no signing secret is configured (fail closed)", async () => {
    expect(await verifyInboundSignature(null, "{}", null)).toBe(false);
    expect(await verifyInboundSignature(undefined, "{}", "sha256=whatever")).toBe(
      false,
    );
  });

  it("generated secrets round-trip through the verifier", async () => {
    const secret = randomSigningSecret();
    const body = "hello world";
    const sig = await hmacHex(secret, body);
    expect(await verifyInboundSignature(secret, body, sig)).toBe(true);
  });
});
