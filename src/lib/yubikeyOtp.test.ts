import { describe, expect, it } from "vitest";
import {
  buildYubiKeyMetadataRemove,
  buildYubiKeyMetadataUpdate,
  getYubiKeyPublicId,
  getYubiKeyPublicIdsFromUser,
  normalizeYubiKeyOtp,
  userHasYubiKeyOtpEnrolled,
} from "./yubikeyOtp";

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
});
