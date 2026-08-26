import type { TempFeedConfig, TempFeedResult, TempProbeConfig } from "./tempFeedConfig";
import {
  evaluateAlerts,
  evaluateForecastFreeze,
  evaluateOutage,
  evaluateRateChange,
  isAlertCooldownActive,
  type AlertReading,
  type AlertSettings,
} from "./alerts";
import { evaluateAlertRules, type RuleEvalContext } from "./alertRules";
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
import { fetchForecastMinTemp } from "./FetchWeather";

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

export async function maybeSendForecastFreezeAlert(
  userId: string,
  email: string | null | undefined,
  settings: AlertSettings,
  weatherCityId?: string | null,
): Promise<void> {
  if (!settings.enabled || !settings.forecastFreezeEnabled) return;
  if (isAlertCooldownActive(settings.lastForecastAlertAt)) return;

  const prefs = weatherCityId
    ? { weatherCityId }
    : null;
  // Prefer explicit city; otherwise fall back to OpenWeather default via null.
  const window = await fetchForecastMinTemp(
    prefs?.weatherCityId ?? weatherCityId ?? null,
    settings.forecastHoursAhead,
  );
  const message = evaluateForecastFreeze(
    settings,
    window?.minTempF ?? null,
    settings.forecastHoursAhead,
  );
  if (!message) return;

  await notifyUser(userId, email, settings, {
    title: "Forecast freeze risk",
    body: message,
    kind: "forecast",
  });
  await markCooldown(userId, "last_forecast_alert_at");
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
  await maybeSendForecastFreezeAlert(userId, email, settings);
}

async function buildRuleContext(
  settings: AlertSettings,
  devices: DeviceWithSensors[],
  readings: AlertReading[],
  householdId?: string | null,
): Promise<RuleEvalContext> {
  const boolSensors: RuleEvalContext["boolSensors"] = [];
  if (householdId) {
    const latest = await fetchLatestSensorValues(householdId);
    for (const row of latest) {
      if (
        row.sensor.kind === "door" ||
        row.sensor.kind === "flood" ||
        row.sensor.kind === "power"
      ) {
        if (typeof row.value_bool === "boolean") {
          boolSensors.push({
            label: row.sensor.label,
            kind: row.sensor.kind,
            value: row.value_bool,
          });
        }
      }
    }
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const rateDrops: RuleEvalContext["rateDrops"] = [];
  for (const device of devices) {
    for (const sensor of device.sensors) {
      if (sensor.kind !== "temperature" || !sensor.visible) continue;
      const values = await getRecentNumericReadings(sensor.id, since);
      if (values.length < 2) continue;
      const drop = values[0]! - values[values.length - 1]!;
      if (drop > 0) {
        rateDrops.push({ label: sensor.label, dropF: drop });
      }
    }
  }

  const now = Date.now();
  const outages: RuleEvalContext["outages"] = [];
  for (const device of devices.filter((d) => d.enabled)) {
    if (!device.last_seen_at) {
      outages.push({ deviceName: device.name, hoursSilent: 999 });
      continue;
    }
    const last = Date.parse(device.last_seen_at);
    if (Number.isNaN(last)) continue;
    outages.push({
      deviceName: device.name,
      hoursSilent: (now - last) / (60 * 60 * 1000),
    });
  }

  return {
    readings,
    boolSensors,
    rateDrops,
    outages,
    freezeThresholdF: settings.freezeThresholdF,
    humidityThreshold: settings.humidityThreshold,
    rateChangeF: settings.rateChangeF,
    outageHours: settings.outageHours,
  };
}

export async function maybeSendRuleAlerts(
  userId: string,
  email: string | null | undefined,
  devices: DeviceWithSensors[],
  settings: AlertSettings,
  readings: AlertReading[],
  householdId?: string | null,
): Promise<void> {
  if (!settings.enabled || settings.alertRules.length === 0) return;
  if (isAlertCooldownActive(settings.lastAlertSentAt)) return;

  const ctx = await buildRuleContext(settings, devices, readings, householdId);
  const messages = evaluateAlertRules(settings.alertRules, ctx);
  if (messages.length === 0) return;

  await notifyUser(userId, email, settings, {
    title: "Garage alert rule matched",
    body: messages.join("\n"),
    kind: "rule",
  });
  await markCooldown(userId, "last_alert_sent_at");
}

export async function maybeSendRateAndOutageAlerts(
  userId: string,
  email: string | null | undefined,
  devices: DeviceWithSensors[],
  settings: AlertSettings,
  householdId?: string | null,
  readings: AlertReading[] = [],
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

  await maybeSendRuleAlerts(
    userId,
    email,
    devices,
    settings,
    readings,
    householdId,
  );
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
