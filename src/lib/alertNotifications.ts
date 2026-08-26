import type { TempFeedConfig, TempFeedResult, TempProbeConfig } from "./tempFeedConfig";
import {
  evaluateAlerts,
  evaluateOutage,
  evaluateRateChange,
  isAlertCooldownActive,
  type AlertReading,
  type AlertSettings,
} from "./alerts";
import {
  getAlertSettingsForUser,
  markCooldown,
  notifyUser,
  saveAlertSettingsForUser,
} from "./notify";
import type { DeviceWithSensors } from "./devices";
import {
  fetchLatestSensorValues,
  getRecentNumericReadings,
} from "./sensorReadings";
import {
  buildAlertReadingsFromLatestSensors,
  buildReadingsFromResults,
  mergeAlertReadings,
} from "./alertReadings";

export {
  buildAlertReadingsFromLatestSensors,
  buildReadingsFromResults,
  mergeAlertReadings,
} from "./alertReadings";

export async function sendThresholdAlertsIfNeeded(
  userId: string,
  email: string | null | undefined,
  settings: AlertSettings,
  readings: AlertReading[],
): Promise<void> {
  if (!settings.enabled || readings.length === 0) return;
  if (isAlertCooldownActive(settings.lastAlertSentAt)) return;

  const messages = evaluateAlerts(settings, readings);
  if (messages.length === 0) return;

  await notifyUser(userId, email, settings, {
    title: "Garage temperature alert",
    body: messages.join("\n"),
    kind: "threshold",
  });
  await markCooldown(userId, "last_alert_sent_at");
}

export async function maybeSendThresholdAlerts(
  userId: string,
  email: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
  existingResults?: TempFeedResult[],
  householdId?: string | null,
): Promise<void> {
  const settings = await getAlertSettingsForUser(userId, userMetadata);
  const visibleProbes = probes.filter((probe) => probe.visible);

  let feedReadings: AlertReading[] = [];
  if (visibleProbes.length > 0 && feeds.length > 0) {
    let results = existingResults;
    if (!results) {
      const { fetchTemps } = await import("./FetchTemps");
      results = await fetchTemps({
        feeds,
        probes: visibleProbes,
        saveToDatabase: false,
      });
    }
    feedReadings = buildReadingsFromResults(results, visibleProbes);
  }

  let sensorReadings: AlertReading[] = [];
  if (householdId) {
    const latest = await fetchLatestSensorValues(householdId);
    sensorReadings = buildAlertReadingsFromLatestSensors(latest);
  }

  const readings = mergeAlertReadings(feedReadings, sensorReadings);
  await sendThresholdAlertsIfNeeded(userId, email, settings, readings);
}

export async function maybeSendRateAndOutageAlerts(
  userId: string,
  email: string | null | undefined,
  devices: DeviceWithSensors[],
  settings: AlertSettings,
): Promise<void> {
  if (!settings.enabled) return;

  const outageMessages: string[] = [];
  for (const device of devices.filter((d) => d.enabled)) {
    const msg = evaluateOutage(settings, device.name, device.last_seen_at);
    if (msg) outageMessages.push(msg);
  }

  if (outageMessages.length > 0 && !isAlertCooldownActive(settings.lastOutageAlertAt)) {
    await notifyUser(userId, email, settings, {
      title: "Device outage alert",
      body: outageMessages.join("\n"),
      kind: "outage",
    });
    await markCooldown(userId, "last_outage_alert_at");
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const rateMessages: string[] = [];

  for (const device of devices) {
    for (const sensor of device.sensors) {
      if (sensor.kind !== "temperature" || !sensor.visible) continue;
      const values = await getRecentNumericReadings(sensor.id, since);
      const msg = evaluateRateChange(settings, sensor.label, values);
      if (msg) rateMessages.push(msg);
    }
  }

  if (rateMessages.length > 0 && !isAlertCooldownActive(settings.lastRateAlertAt)) {
    await notifyUser(userId, email, settings, {
      title: "Rapid temperature change",
      body: rateMessages.join("\n"),
      kind: "rate",
    });
    await markCooldown(userId, "last_rate_alert_at");
  }
}

export async function updateUserAlertSettings(
  _accessToken: string,
  _refreshToken: string,
  userId: string,
  settings: AlertSettings,
): Promise<{ error: Error | null }> {
  const result = await saveAlertSettingsForUser(userId, settings);
  return { error: result.error ? new Error(result.error) : null };
}
