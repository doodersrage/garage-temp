import { summarizeStaleSensors, type StaleSensorSummary } from "./sensorFreshness";
import type { DeviceWithSensors } from "./devices";
import { resolveAlertEmail, type AlertSettings } from "./alerts";
import type { LatestSensorRow } from "./sensorReadings";
import { listLowBatteryDevices } from "./deviceBatteryUi";
import { isVacationActive } from "./alertSnooze";

export type ReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
};

export type FreezeReadinessResult = {
  score: number;
  checks: ReadinessCheck[];
  ready: boolean;
};

export function hasConfiguredAlertChannel(
  alertSettings: AlertSettings,
  fallbackEmail?: string | null,
): boolean {
  return (
    (alertSettings.channelEmail &&
      Boolean(resolveAlertEmail(alertSettings, fallbackEmail))) ||
    (alertSettings.channelSms && Boolean(alertSettings.smsPhone?.trim())) ||
    (alertSettings.channelDiscord && Boolean(alertSettings.discordWebhookUrl?.trim())) ||
    alertSettings.channelPush ||
    (alertSettings.channelWebhook && Boolean(alertSettings.outboundWebhookUrl?.trim())) ||
    (alertSettings.channelTelegram &&
      Boolean(alertSettings.telegramBotToken?.trim() && alertSettings.telegramChatId?.trim())) ||
    (alertSettings.channelSlack && Boolean(alertSettings.slackWebhookUrl?.trim())) ||
    (alertSettings.channelTeams && Boolean(alertSettings.teamsWebhookUrl?.trim())) ||
    (alertSettings.channelNtfy && Boolean(alertSettings.ntfyTopic?.trim())) ||
    (alertSettings.channelPushover &&
      Boolean(alertSettings.pushoverUserKey?.trim() && alertSettings.pushoverAppToken?.trim())) ||
    (alertSettings.channelWhatsapp && Boolean(alertSettings.whatsappPhone?.trim()))
  );
}

export function computeFreezeReadiness(input: {
  alertSettings: AlertSettings;
  devices: DeviceWithSensors[];
  latest: LatestSensorRow[];
  weatherLocationConfigured: boolean;
  canUseForecast: boolean;
  canUseNws: boolean;
  hasSentAnyAlert: boolean;
  nowMs?: number;
}): FreezeReadinessResult {
  const {
    alertSettings,
    devices,
    latest,
    weatherLocationConfigured,
    canUseForecast,
    canUseNws,
    hasSentAnyAlert,
    nowMs = Date.now(),
  } = input;

  const stale: StaleSensorSummary = summarizeStaleSensors(latest, devices);
  const lowBattery = listLowBatteryDevices(devices, alertSettings.batteryThresholdPct);

  const channelOk = alertSettings.enabled && hasConfiguredAlertChannel(alertSettings);
  const vacationOn = isVacationActive(alertSettings, nowMs);
  const hasFloodSensor = devices.some((d) => d.sensors.some((s) => s.kind === "flood"));
  const hasLevelSensor = devices.some((d) => d.sensors.some((s) => s.kind === "level"));

  const checks: ReadinessCheck[] = [
    {
      id: "alerts_on",
      label: "Alerts enabled (freeze + auto flood)",
      ok: alertSettings.enabled,
      hint: alertSettings.enabled
        ? undefined
        : "Turn alerts on under Dashboard → Alerts: flood/leak contacts notify automatically when wet.",
    },
    {
      id: "channel",
      label: "At least one alert channel configured",
      ok: channelOk,
      hint: channelOk ? undefined : "Enable email, SMS, or another channel with a destination.",
    },
    {
      id: "test_alert",
      label: "Test alert sent at least once",
      ok: hasSentAnyAlert,
      hint: hasSentAnyAlert ? undefined : "Send a test from Dashboard → Alerts before cold season.",
    },
    {
      id: "devices",
      label: "Push or pull device registered",
      ok: devices.length > 0,
      hint: devices.length > 0 ? undefined : "Add a device under Dashboard → Temperature.",
    },
    {
      id: "flood_sensor",
      label: "Flood / leak contact registered",
      ok: hasFloodSensor,
      hint: hasFloodSensor
        ? undefined
        : "Add a wet/dry contact under a water heater, laundry, or sump: ingest kind flood auto-alerts when wet.",
    },
    {
      id: "fresh",
      label: "All probes reporting (not stale)",
      ok: stale.total === 0,
      hint:
        stale.total === 0
          ? undefined
          : stale.bannerMessage ?? `${stale.total} probe(s) haven't reported recently.`,
    },
    {
      id: "battery",
      label: "No critically low probe batteries",
      ok: lowBattery.length === 0,
      hint:
        lowBattery.length === 0
          ? undefined
          : `${lowBattery.length} device(s) below ${alertSettings.batteryThresholdPct}% battery.`,
    },
    {
      id: "vacation_clear",
      label: "Not muted by vacation mode",
      ok: !vacationOn,
      hint: vacationOn
        ? "Vacation suppresses threshold noise: flood and forecast still fire. Clear vacation under Alerts when you are home."
        : undefined,
    },
    {
      id: "weather",
      label: "Weather / NWS location configured",
      ok: weatherLocationConfigured,
      hint: weatherLocationConfigured
        ? undefined
        : "Set outdoor weather in Dashboard → Settings (OpenWeather city, Ambient station, or WeatherFlow).",
    },
    {
      id: "runway",
      label: "Time-to-freeze remaining-hours alerts",
      ok: alertSettings.runwayAlertEnabled,
      hint: alertSettings.runwayAlertEnabled
        ? undefined
        : "Enable remaining-hours alerts so you hear before the probe crosses freeze.",
    },
  ];

  if (hasLevelSensor) {
    checks.push({
      id: "level_rule",
      label: "Optional: sump/tank level_above rule",
      ok: (alertSettings.alertRules ?? []).some(
        (rule) =>
          rule.enabled !== false &&
          (rule.all ?? []).some((c) => c.type === "level_above"),
      ),
      hint: "Level sensors display on Overview; add a Rules → level_above condition if you want pump-failure early warning.",
    });
  }

  if (canUseForecast) {
    checks.push({
      id: "forecast",
      label: "Forecast cold-risk alerts enabled",
      ok: alertSettings.forecastFreezeEnabled,
      hint: alertSettings.forecastFreezeEnabled
        ? undefined
        : "Member+ can enable forecast freeze warnings in alert settings.",
    });
  }

  if (canUseNws) {
    checks.push({
      id: "nws",
      label: "Official NWS freeze alerts enabled",
      ok: alertSettings.nwsFreezeAlertsEnabled,
      hint: alertSettings.nwsFreezeAlertsEnabled
        ? undefined
        : "Pro can enable NWS freeze/cold alerts in alert settings.",
    });
  }

  const passed = checks.filter((c) => c.ok).length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;

  return {
    score,
    checks,
    ready:
      score >= 85 &&
      checks.find((c) => c.id === "alerts_on")?.ok === true &&
      channelOk &&
      !vacationOn,
  };
}
