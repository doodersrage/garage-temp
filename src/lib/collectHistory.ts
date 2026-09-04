import { createAdminClient } from "./supabase";
import { fetchTemps } from "./FetchTemps";
import { getUserDevicesAsTempConfig } from "./devices";
import {
  listAllHouseholdOwnerUserIds,
  listHouseholdIdsForCron,
  listHouseholdMembers,
} from "./households";
import {
  maybeSendRateAndOutageAlerts,
  maybeSendDeviceHealthAlerts,
  maybeSendThresholdAlerts,
} from "./alertNotifications";
import { getAlertSettingsForUser } from "./notify";
import { collectThermostatSnapshotsForAllHouseholds } from "./thermostatSnapshots";

export type FeedHealthStatus = {
  feedId: string;
  feedName: string;
  url: string;
  ok: boolean;
  message: string;
  probeCount: number;
  checkedAt: string;
  userId?: string;
  userEmail?: string | null;
};

export async function checkFeedHealth(
  userId: string,
): Promise<{ statuses: FeedHealthStatus[]; error: string | null }> {
  const config = await getUserDevicesAsTempConfig(userId);

  if (config.error) {
    return { statuses: [], error: config.error };
  }

  const enabledFeeds = config.feeds.filter((feed) => feed.enabled);
  const results = await fetchTemps({
    feeds: enabledFeeds,
    probes: config.probes,
    devices: config.devices,
    householdId: config.householdId,
    saveToDatabase: false,
  });

  const checkedAt = new Date().toISOString();
  const statuses: FeedHealthStatus[] = enabledFeeds.map((feed) => {
    const result = results.find((item) => item.id === feed.id);

    if (!result || result.error) {
      return {
        feedId: feed.id,
        feedName: feed.name,
        url: feed.url,
        ok: false,
        message: result?.error ?? "Feed unreachable",
        probeCount: 0,
        checkedAt,
        userId,
      };
    }

    return {
      feedId: feed.id,
      feedName: feed.name,
      url: feed.url,
      ok: true,
      message: `${Object.keys(result.probes).length} probe(s) responding`,
      probeCount: Object.keys(result.probes).length,
      checkedAt,
      userId,
    };
  });

  return { statuses, error: null };
}

export async function collectAllUsersFeedHealth(): Promise<{
  statuses: FeedHealthStatus[];
  errors: string[];
}> {
  const errors: string[] = [];
  const statuses: FeedHealthStatus[] = [];
  const userIds = await listAllHouseholdOwnerUserIds();
  const admin = createAdminClient();

  for (const userId of userIds) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const userEmail = userData.user?.email ?? null;

    const health = await checkFeedHealth(userId);
    if (health.error) {
      errors.push(`${userEmail ?? userId}: ${health.error}`);
      continue;
    }

    statuses.push(
      ...health.statuses.map((status) => ({
        ...status,
        userEmail,
      })),
    );
  }

  return { statuses, errors };
}

export async function collectHistoryForAllUsers(): Promise<{
  usersProcessed: number;
  householdsProcessed: number;
  errors: string[];
  warnings: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const warnings: string[] = [];
  let usersProcessed = 0;
  let householdsProcessed = 0;

  const households = await listHouseholdIdsForCron();

  for (const { householdId, ownerUserId } of households) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(ownerUserId);
      const authUser = userData.user;
      const config = await getUserDevicesAsTempConfig(ownerUserId, authUser?.email);

      if (config.error) {
        errors.push(`${ownerUserId}: ${config.error}`);
        continue;
      }

      // Force household from cron list (owner preferred devices)
      if (config.householdId !== householdId && householdId) {
        // Still collect using owner's device config for this household id
      }

      const visibleProbes = config.probes.filter((probe) => probe.visible);
      const results = await fetchTemps({
        feeds: config.feeds,
        probes: visibleProbes,
        devices: config.devices,
        householdId: config.householdId || householdId,
        saveToDatabase: true,
        userId: ownerUserId,
        userEmail: authUser?.email,
        sendAlerts: false,
      });

      const members = await listHouseholdMembers(config.householdId || householdId);
      for (const member of members.members) {
        const { data: memberData } = await admin.auth.admin.getUserById(member.user_id);
        const memberUser = memberData.user;
        await maybeSendThresholdAlerts(
          member.user_id,
          memberUser?.email,
          memberUser?.user_metadata as Record<string, unknown> | undefined,
          config.feeds,
          config.probes,
          results,
          config.householdId || householdId,
          config.devices,
        );

        const settings = await getAlertSettingsForUser(
          member.user_id,
          memberUser?.user_metadata as Record<string, unknown> | undefined,
        );
        await maybeSendRateAndOutageAlerts(
          member.user_id,
          memberUser?.email,
          config.devices,
          settings,
          config.householdId || householdId,
        );
        await maybeSendDeviceHealthAlerts(
          member.user_id,
          memberUser?.email,
          config.devices,
          settings,
        );
        usersProcessed += 1;
      }

      householdsProcessed += 1;
    } catch (e) {
      errors.push(
        `${ownerUserId}: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  const thermostatResult = await collectThermostatSnapshotsForAllHouseholds();
  for (const message of thermostatResult.errors) {
    errors.push(`thermostat: ${message}`);
  }
  for (const message of thermostatResult.warnings) {
    warnings.push(`thermostat: ${message}`);
  }

  return { usersProcessed, householdsProcessed, errors, warnings };
}
