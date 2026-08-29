import type { TempFeedConfig, TempFeedResult, TempProbeConfig } from "./tempFeedConfig";
import {
  evaluateAlerts,
  evaluateBatteryHealth,
  evaluateForecastFreeze,
  evaluateOutage,
  evaluateRateChange,
  evaluateRssiHealth,
  isAlertCooldownActive,
  type AlertReading,
  type AlertSettings,
} from "./alerts";
import { evaluateAlertRules, type RuleEvalContext } from "./alertRules";
import {
  getAlertSettingsForUser,
  markCooldown,
  markEscalation,
  notifyUser,
  saveAlertSettingsForUser,
} from "./notify";
import type { DeviceWithSensors } from "./devices";
import {
  fetchLatestSensorValues,
  fetchRecentBoolReadings,
  getRecentNumericReadings,
} from "./sensorReadings";
import {
  detectBatteryTrendDrop,
  type BatterySample,
} from "./batteryTrend";
import {
  deviceHealthFromDevices,
  readDeviceMetaNumber,
} from "./deviceHealth";
import {
  buildAlertReadingsFromLatestSensors,
  buildReadingsFromResults,
  mergeAlertReadings,
} from "./alertReadings";
import { fetchForecastMinTemp, fetchWeatherSnapshot } from "./FetchWeather";
import { fetchNwsAlerts, hasFreezeRelatedNwsAlert } from "./nwsAlerts";
import { buildSnoozeUrl } from "./alertSnoozeTokens";
import { buildSiteUrl } from "./siteUrl";
import { computeDoorOpenSessions } from "./doorDuration";
import { persistDoorSessions } from "./doorEvents";
import { createAdminClient } from "./supabase";
import { getUserEntitlements } from "./entitlements";

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

  const messages = evaluateAlerts(settings, readings);
  if (messages.length > 0 && settings.escalationEnabled && settings.channelSms) {
    const lastAlert = settings.lastAlertSentAt
      ? Date.parse(settings.lastAlertSentAt)
      : NaN;
    const lastEsc = settings.lastEscalationAt
      ? Date.parse(settings.lastEscalationAt)
      : 0;
    const elapsedOk =
      Number.isFinite(lastAlert) &&
      Date.now() - lastAlert >= settings.escalationMinutes * 60 * 1000;
    const notEscalatedYet = !Number.isFinite(lastEsc) || lastEsc < lastAlert;
    if (elapsedOk && notEscalatedYet) {
      await notifyUser(
        userId,
        email,
        settings,
        {
          title: "Escalated: Temperature alert",
          body: messages.join("\n"),
          kind: "threshold",
        },
        { smsOnly: true },
      );
      await markEscalation(userId);
    }
  }

  if (isAlertCooldownActive(settings.lastAlertSentAt)) return;
  if (messages.length === 0) return;

  const alertSpace = readings.find((r) => r.space)?.space ?? null;
  await notifyUser(userId, email, settings, {
    title: "Temperature alert",
    body: messages.join("\n"),
    kind: "threshold",
  }, { space: alertSpace });
  await markCooldown(userId, "last_alert_sent_at");
}

export async function maybeSendForecastFreezeAlert(
  userId: string,
  email: string | null | undefined,
  settings: AlertSettings,
  weatherCityId?: string | null,
): Promise<void> {
  if (!settings.enabled || !settings.forecastFreezeEnabled) return;
  const entitlements = await getUserEntitlements(userId);
  if (!entitlements.canUseForecastAlerts) return;
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

async function resolveWeatherCityIdForUser(
  userId: string,
  weatherCityId?: string | null,
): Promise<string | null> {
  if (weatherCityId) return weatherCityId;
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const meta = data.user?.user_metadata;
    if (typeof meta?.weather_city_id === "string" && meta.weather_city_id.trim()) {
      return meta.weather_city_id.trim();
    }
  } catch {
    // fall through to OpenWeather default
  }
  return null;
}

export async function maybeSendNwsFreezeAlert(
  userId: string,
  email: string | null | undefined,
  settings: AlertSettings,
  weatherCityId?: string | null,
): Promise<void> {
  if (!settings.enabled || !settings.nwsFreezeAlertsEnabled) return;
  const entitlements = await getUserEntitlements(userId);
  if (!entitlements.canUseNwsAlerts) return;
  if (isAlertCooldownActive(settings.lastNwsAlertAt)) return;

  const cityId = await resolveWeatherCityIdForUser(userId, weatherCityId);
  const snapshot = await fetchWeatherSnapshot(cityId);
  if (
    snapshot?.lat == null ||
    snapshot?.lon == null ||
    !Number.isFinite(snapshot.lat) ||
    !Number.isFinite(snapshot.lon)
  ) {
    return;
  }

  const summary = await fetchNwsAlerts(snapshot.lat, snapshot.lon);
  if (!hasFreezeRelatedNwsAlert(summary)) return;

  const first = summary!.alerts[0]!;
  const body =
    first.headline?.trim() ||
    first.event ||
    "National Weather Service freeze / cold advisory is active near your weather city.";

  await notifyUser(userId, email, settings, {
    title: "NWS freeze / cold alert",
    body,
    kind: "nws",
  });
  await markCooldown(userId, "last_nws_alert_at");
}

export async function maybeSendThresholdAlerts(
  userId: string,
  email: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
  existingResults?: TempFeedResult[],
  householdId?: string | null,
  devices?: DeviceWithSensors[],
): Promise<void> {
  const settings = await getAlertSettingsForUser(userId, userMetadata);
  const visibleProbes = probes.filter((probe) => probe.visible);

  let deviceList = devices ?? [];
  if (deviceList.length === 0 && householdId) {
    const { listHouseholdDevices } = await import("./devices");
    const listed = await listHouseholdDevices(householdId);
    deviceList = listed.devices;
  }

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
    feedReadings = buildReadingsFromResults(results, visibleProbes, deviceList);
  }

  let sensorReadings: AlertReading[] = [];
  if (householdId) {
    const latest = await fetchLatestSensorValues(householdId);
    sensorReadings = buildAlertReadingsFromLatestSensors(latest);
  }

  const readings = mergeAlertReadings(feedReadings, sensorReadings);
  await sendThresholdAlertsIfNeeded(userId, email, settings, readings);
  await maybeSendForecastFreezeAlert(userId, email, settings);
  await maybeSendNwsFreezeAlert(userId, email, settings);
}

async function buildRuleContext(
  settings: AlertSettings,
  devices: DeviceWithSensors[],
  readings: AlertReading[],
  householdId?: string | null,
): Promise<RuleEvalContext> {
  const boolSensors: RuleEvalContext["boolSensors"] = [];
  const numericSensors: RuleEvalContext["numericSensors"] = [];
  const doorOpenSessions: RuleEvalContext["doorOpenSessions"] = [];
  const doorSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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
      if (
        (row.sensor.kind === "co2" ||
          row.sensor.kind === "humidity" ||
          row.sensor.kind === "generic") &&
        typeof row.value_num === "number" &&
        Number.isFinite(row.value_num)
      ) {
        numericSensors.push({
          label: row.sensor.label,
          kind: row.sensor.kind,
          value: row.value_num,
        });
      }
    }

    const sensorIdByLabel = new Map<string, string>();

    for (const device of devices) {
      for (const sensor of device.sensors) {
        if (sensor.kind !== "door") continue;
        sensorIdByLabel.set(sensor.label, sensor.id);
        const readings = await fetchRecentBoolReadings(sensor.id, doorSince);
        const sessions = computeDoorOpenSessions(
          readings.map((r) => ({
            label: sensor.label,
            kind: "door",
            value: r.value,
            recordedAt: r.recordedAt,
          })),
        );
        doorOpenSessions.push(...sessions);
      }
    }

    try {
      await persistDoorSessions(householdId, doorOpenSessions as import("./doorDuration").DoorOpenSession[], sensorIdByLabel);
    } catch (err) {
      console.error("persistDoorSessions failed:", err);
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
    numericSensors,
    doorOpenSessions,
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
    title: "Alert rule matched",
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

export async function maybeSendDeviceHealthAlerts(
  userId: string,
  email: string | null | undefined,
  devices: DeviceWithSensors[],
  settings: AlertSettings,
  siteBaseUrl?: string,
): Promise<void> {
  if (!settings.enabled) return;

  const health = deviceHealthFromDevices(devices);
  const base = siteBaseUrl ?? buildSiteUrl();
  const snoozeUrl = await buildSnoozeUrl(base, userId);
  const notifyOpts = { snoozeUrl };

  const batteryMessages = evaluateBatteryHealth(settings, health);
  if (
    batteryMessages.length > 0 &&
    !isAlertCooldownActive(settings.lastBatteryAlertAt)
  ) {
    await notifyUser(
      userId,
      email,
      settings,
      {
        title: "Device battery low",
        body: batteryMessages.join("\n"),
        kind: "battery",
      },
      notifyOpts,
    );
    await markCooldown(userId, "last_battery_alert_at");
  }

  const rssiMessages = evaluateRssiHealth(settings, health);
  if (rssiMessages.length > 0 && !isAlertCooldownActive(settings.lastRssiAlertAt)) {
    await notifyUser(
      userId,
      email,
      settings,
      {
        title: "Device signal weak",
        body: rssiMessages.join("\n"),
        kind: "rssi",
      },
      notifyOpts,
    );
    await markCooldown(userId, "last_rssi_alert_at");
  }

  if (settings.batteryTrendAlertsEnabled) {
    for (const device of devices) {
      const history = device.meta?.battery_history as BatterySample[] | undefined;
      const trend = detectBatteryTrendDrop(Array.isArray(history) ? history : []);
      if (trend && !isAlertCooldownActive(settings.lastBatteryTrendAlertAt)) {
        await notifyUser(
          userId,
          email,
          settings,
          { title: "Battery trend alert", body: `${device.name}: ${trend}`, kind: "battery" },
          notifyOpts,
        );
        await markCooldown(userId, "last_battery_trend_alert_at");
        break;
      }
    }
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
