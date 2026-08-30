import {
  isUserAdmin,
  isUserInGroup,
  MEMBER_GROUP_NAME,
} from "./adminAccess";

export { resolvePlanTierFromPriceId } from "./planTier";

export const PRO_GROUP_NAME = "pro";

export type PlanTier = "free" | "member" | "pro" | "admin";

export const FREE_MAX_DEVICES = 2;
export const MEMBER_MAX_DEVICES = 6;
export const PRO_MAX_DEVICES = 24;

export const FREE_HISTORY_DAYS = 7;
export const MEMBER_HISTORY_DAYS = 90;
export const PRO_HISTORY_DAYS = 365;

const FREE_MAX_OWNED_HOUSEHOLDS = 1;
const MEMBER_MAX_OWNED_HOUSEHOLDS = 1;
const PRO_MAX_OWNED_HOUSEHOLDS = 50;

export type Entitlements = {
  tier: PlanTier;
  canDownloadCsv: boolean;
  canUseSms: boolean;
  canUsePush: boolean;
  canUseOutboundWebhook: boolean;
  canCreateShareLinks: boolean;
  canUseClaimsPack: boolean;
  canUsePortfolio: boolean;
  canUseForecastAlerts: boolean;
  canUseNwsAlerts: boolean;
  maxDevices: number;
  maxOwnedHouseholds: number;
  historyDays: number;
};

function entitlementsFor(tier: PlanTier): Entitlements {
  const memberOrAbove = tier === "member" || tier === "pro" || tier === "admin";
  const proOrAbove = tier === "pro" || tier === "admin";

  return {
    tier,
    canDownloadCsv: memberOrAbove,
    canUseSms: proOrAbove,
    canUsePush: proOrAbove,
    canUseOutboundWebhook: proOrAbove,
    canCreateShareLinks: proOrAbove,
    canUseClaimsPack: proOrAbove,
    canUsePortfolio: proOrAbove,
    canUseForecastAlerts: memberOrAbove,
    canUseNwsAlerts: proOrAbove,
    maxDevices: proOrAbove
      ? PRO_MAX_DEVICES
      : memberOrAbove
        ? MEMBER_MAX_DEVICES
        : FREE_MAX_DEVICES,
    maxOwnedHouseholds: proOrAbove
      ? PRO_MAX_OWNED_HOUSEHOLDS
      : memberOrAbove
        ? MEMBER_MAX_OWNED_HOUSEHOLDS
        : FREE_MAX_OWNED_HOUSEHOLDS,
    historyDays: proOrAbove
      ? PRO_HISTORY_DAYS
      : memberOrAbove
        ? MEMBER_HISTORY_DAYS
        : FREE_HISTORY_DAYS,
  };
}

export function formatHistoryRetention(days: number): string {
  if (days >= 365) {
    const years = days / 365;
    return years === 1 ? "1 year" : `${Number.isInteger(years) ? years : years.toFixed(1)} years`;
  }
  return `${days} days`;
}

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  const [admin, pro, member] = await Promise.all([
    isUserAdmin(userId),
    isUserInGroup(userId, PRO_GROUP_NAME),
    isUserInGroup(userId, MEMBER_GROUP_NAME),
  ]);

  if (admin) return entitlementsFor("admin");
  if (pro) return entitlementsFor("pro");
  if (member) return entitlementsFor("member");
  return entitlementsFor("free");
}
