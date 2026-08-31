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

/** Extra trial days earned when friends subscribe (stored in referrer metadata). */
export function referralRewardTrialDays(metadata: Record<string, unknown> | null | undefined): number {
  const raw = metadata?.referral_reward_days;
  const days = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.min(Math.floor(days), 28);
}

export const PRO_TRIAL_DAYS = 14;

/** OAuth/email signups within this window can still receive a referral code. */
export function isLikelyNewUser(createdAt: string): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 10 * 60 * 1000;
}

// referred_by and referral_reward_days deliberately live in app_metadata,
// not user_metadata: Supabase's client-side auth.updateUser({ data }) call
// lets an end user rewrite their own user_metadata directly against
// Supabase's Auth API using nothing but their own session and the public
// anon key -- entirely bypassing this app's server. app_metadata can only
// be written via the service-role admin API (admin.auth.admin.updateUserById),
// which is exactly what these two functions already use, so storing the
// referral trust state there instead costs nothing and closes a
// self-service "grant myself extra trial days" hole.
export async function applyReferralForNewUser(
  userId: string,
  refCode: string,
  userAppMetadata?: Record<string, unknown> | null,
): Promise<void> {
  const normalized = refCode.trim().toLowerCase();
  if (!normalized || userAppMetadata?.referred_by) return;

  const referrerId = await resolveReferrerUserId(normalized);
  if (!referrerId) return;

  await recordReferralSignup(referrerId, userId);
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(userAppMetadata ?? {}),
      referred_by: normalized,
    },
  });
}

export type ReferralStats = {
  totalSignups: number;
  rewardedSignups: number;
  topReferrers: { userId: string; count: number }[];
};

export async function grantReferrerRewardOnSubscription(
  referredUserId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: signup } = await admin
    .from("referral_signups")
    .select("referrer_user_id, referrer_rewarded_at")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();

  if (!signup || signup.referrer_rewarded_at) return;

  await admin
    .from("referral_signups")
    .update({ referrer_rewarded_at: new Date().toISOString() })
    .eq("referred_user_id", referredUserId);

  const { data: referrerUser } = await admin.auth.admin.getUserById(
    signup.referrer_user_id,
  );
  const meta = referrerUser.user?.app_metadata ?? {};
  const current = referralRewardTrialDays(meta);
  await admin.auth.admin.updateUserById(signup.referrer_user_id, {
    app_metadata: {
      ...meta,
      referral_reward_days: current + 7,
    },
  });
}

export async function fetchReferralAdminStats(): Promise<ReferralStats> {
  const supabase = createServerClient();
  const { count: totalSignups } = await supabase
    .from("referral_signups")
    .select("id", { count: "exact", head: true });

  const { count: rewardedSignups } = await supabase
    .from("referral_signups")
    .select("id", { count: "exact", head: true })
    .not("referrer_rewarded_at", "is", null);

  const { data: rows } = await supabase
    .from("referral_signups")
    .select("referrer_user_id");

  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.referrer_user_id, (counts.get(row.referrer_user_id) ?? 0) + 1);
  }

  const topReferrers = [...counts.entries()]
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSignups: totalSignups ?? 0,
    rewardedSignups: rewardedSignups ?? 0,
    topReferrers,
  };
}
