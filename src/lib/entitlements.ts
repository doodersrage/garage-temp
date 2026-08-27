import {
  isUserAdmin,
  isUserInGroup,
  MEMBER_GROUP_NAME,
} from "./adminAccess";

export { resolvePlanTierFromPriceId } from "./planTier";

export const PRO_GROUP_NAME = "pro";

export type PlanTier = "free" | "member" | "pro" | "admin";

export type Entitlements = {
  tier: PlanTier;
  canDownloadCsv: boolean;
  canUseSms: boolean;
  canUsePush: boolean;
  canUseOutboundWebhook: boolean;
  canCreateShareLinks: boolean;
  maxDevices: number;
  maxOwnedHouseholds: number;
};

const FREE_MAX_DEVICES = 2;
const MEMBER_MAX_DEVICES = 6;
const PRO_MAX_DEVICES = 24;

const FREE_MAX_OWNED_HOUSEHOLDS = 1;
const MEMBER_MAX_OWNED_HOUSEHOLDS = 1;
const PRO_MAX_OWNED_HOUSEHOLDS = 50;

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  const [admin, pro, member] = await Promise.all([
    isUserAdmin(userId),
    isUserInGroup(userId, PRO_GROUP_NAME),
    isUserInGroup(userId, MEMBER_GROUP_NAME),
  ]);

  if (admin) {
    return {
      tier: "admin",
      canDownloadCsv: true,
      canUseSms: true,
      canUsePush: true,
      canUseOutboundWebhook: true,
      canCreateShareLinks: true,
      maxDevices: PRO_MAX_DEVICES,
      maxOwnedHouseholds: PRO_MAX_OWNED_HOUSEHOLDS,
    };
  }

  if (pro) {
    return {
      tier: "pro",
      canDownloadCsv: true,
      canUseSms: true,
      canUsePush: true,
      canUseOutboundWebhook: true,
      canCreateShareLinks: true,
      maxDevices: PRO_MAX_DEVICES,
      maxOwnedHouseholds: PRO_MAX_OWNED_HOUSEHOLDS,
    };
  }

  if (member) {
    return {
      tier: "member",
      canDownloadCsv: true,
      canUseSms: false,
      canUsePush: false,
      canUseOutboundWebhook: false,
      canCreateShareLinks: false,
      maxDevices: MEMBER_MAX_DEVICES,
      maxOwnedHouseholds: MEMBER_MAX_OWNED_HOUSEHOLDS,
    };
  }

  return {
    tier: "free",
    canDownloadCsv: false,
    canUseSms: false,
    canUsePush: false,
    canUseOutboundWebhook: false,
    canCreateShareLinks: false,
    maxDevices: FREE_MAX_DEVICES,
    maxOwnedHouseholds: FREE_MAX_OWNED_HOUSEHOLDS,
  };
}
