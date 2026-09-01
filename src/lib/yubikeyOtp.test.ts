import { describe, expect, it } from "vitest";
import {
  buildYubiKeyMetadataRemove,
  buildYubiKeyMetadataUpdate,
  getYubiKeyPublicId,
  getYubiKeyPublicIdsFromUser,
  isYubiKeyOtpConfigured,
  normalizeYubiKeyOtp,
  signYubiCloudRequest,
  userHasYubiKeyOtpEnrolled,
  verifyYubiCloudResponseSignature,
} from "./yubikeyOtp";
import { yubicoDocTestVectors } from "./yubikeyOtpTestVectors";

describe("yubikeyOtp helpers", () => {
  const sampleOtp = "cccccccccccccccccccccccccccccccccccccccccccc";
  const samplePublicId = "cccccccccccc";

  it("normalizes valid modhex OTP strings", () => {
    expect(normalizeYubiKeyOtp(sampleOtp.toUpperCase())).toBe(sampleOtp);
    expect(normalizeYubiKeyOtp("not-a-yubikey")).toBeNull();
    expect(normalizeYubiKeyOtp("abc")).toBeNull();
  });

  it("extracts the public id prefix", () => {
    expect(getYubiKeyPublicId(sampleOtp)).toBe(samplePublicId);
  });

  it("reads enrolled public ids from user metadata", () => {
    const user = {
      user_metadata: {
        yubikey_otp_public_ids: ["ccccccjtfnij", "INVALID", "bbbbbbukuehe"],
      },
    };
    expect(getYubiKeyPublicIdsFromUser(user)).toEqual([
      "ccccccjtfnij",
      "bbbbbbukuehe",
    ]);
    expect(userHasYubiKeyOtpEnrolled(user)).toBe(true);
    expect(userHasYubiKeyOtpEnrolled({ user_metadata: {} })).toBe(false);
  });

  it("builds metadata add/remove updates", () => {
    expect(buildYubiKeyMetadataUpdate(["aaaa"], "bbbbbbukuehe")).toEqual({
      yubikey_otp_public_ids: ["aaaa", "bbbbbbukuehe"],
    });
    expect(buildYubiKeyMetadataRemove(["aaaa", "bbbb"], "aaaa")).toEqual({
      yubikey_otp_public_ids: ["bbbb"],
    });
  });

  it("detects YubiCloud config via runtime env", () => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const prevClient = env.YUBICO_CLIENT_ID;
    const prevKey = env.YUBICO_API_KEY;
    env.YUBICO_CLIENT_ID = "12345";
    env.YUBICO_API_KEY = "dGVzdA==";
    expect(isYubiKeyOtpConfigured()).toBe(true);
    env.YUBICO_CLIENT_ID = "";
    env.YUBICO_API_KEY = "";
    expect(isYubiKeyOtpConfigured()).toBe(false);
    env.YUBICO_CLIENT_ID = prevClient;
    env.YUBICO_API_KEY = prevKey;
  });

  it("signs YubiCloud requests with the official test vector", async () => {
    const vectors = yubicoDocTestVectors;
    const signature = await signYubiCloudRequest(
      {
        id: vectors.clientId,
        nonce: vectors.nonce,
        otp: vectors.otp,
      },
      vectors.apiKeyBase64(),
    );
    expect(signature).toBe(vectors.requestSignatureBase64());
  });

  it("verifies CRLF YubiCloud response bodies", async () => {
    const vectors = yubicoDocTestVectors;
    const apiKey = vectors.apiKeyBase64();
    const params = vectors.responseParams;
    const signature = await signYubiCloudRequest(params, apiKey);
    const body = [
      `h=${signature}`,
      `t=${params.t}`,
      `otp=${params.otp}`,
      `nonce=${params.nonce}`,
      `sl=${params.sl}`,
      `status=${params.status}`,
    ].join("\r\n");
    expect(await verifyYubiCloudResponseSignature(body, apiKey)).toBe(true);
  });
});
