const MODHEX_CHAR = "[cbdefghijklnrtuv]";
const PUBLIC_ID_PATTERN = new RegExp(`^${MODHEX_CHAR}{12}$`, "i");

export const YUBIKEY_OTP_METADATA_KEY = "yubikey_otp_public_ids";

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
