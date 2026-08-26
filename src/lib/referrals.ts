import { createAdminClient, createServerClient } from "./supabase";

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function randomCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes]
    .map((b) => CODE_CHARS[b % CODE_CHARS.length])
    .join("");
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.code) return existing.code;

  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const { error } = await admin.from("referral_codes").insert({
      user_id: userId,
      code,
    });
    if (!error) return code;
  }

  throw new Error("Unable to create referral code");
}

export async function resolveReferrerUserId(code: string): Promise<string | null> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = createServerClient();
  const { data } = await supabase
    .from("referral_codes")
    .select("user_id")
    .eq("code", normalized)
    .maybeSingle();

  return data?.user_id ?? null;
}

export async function recordReferralSignup(
  referrerUserId: string,
  referredUserId: string,
): Promise<void> {
  if (referrerUserId === referredUserId) return;

  const admin = createAdminClient();
  await admin.from("referral_signups").upsert(
    {
      referrer_user_id: referrerUserId,
      referred_user_id: referredUserId,
    },
    { onConflict: "referred_user_id" },
  );
}

export async function countReferralSignups(userId: string): Promise<number> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("referral_signups")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", userId);

  return count ?? 0;
}

/** Extra Pro trial days when the user signed up via referral. */
export function referralBonusTrialDays(referredByCode: string | null | undefined): number {
  return referredByCode ? 7 : 0;
}

export const PRO_TRIAL_DAYS = 14;

/** OAuth/email signups within this window can still receive a referral code. */
export function isLikelyNewUser(createdAt: string): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 10 * 60 * 1000;
}

export async function applyReferralForNewUser(
  userId: string,
  refCode: string,
  userMetadata?: Record<string, unknown> | null,
): Promise<void> {
  const normalized = refCode.trim().toLowerCase();
  if (!normalized || userMetadata?.referred_by) return;

  const referrerId = await resolveReferrerUserId(normalized);
  if (!referrerId) return;

  await recordReferralSignup(referrerId, userId);
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(userMetadata ?? {}),
      referred_by: normalized,
    },
  });
}
