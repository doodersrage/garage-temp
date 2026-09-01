import { summarizeStaleSensors, type StaleSensorSummary } from "./sensorFreshness";
import type { DeviceWithSensors } from "./devices";
import type { AlertSettings } from "./alerts";
import type { LatestSensorRow } from "./sensorReadings";
import { listLowBatteryDevices } from "./deviceBatteryUi";

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

export function computeFreezeReadiness(input: {
  alertSettings: AlertSettings;
  devices: DeviceWithSensors[];
  latest: LatestSensorRow[];
  weatherCityId: string | null;
  canUseForecast: boolean;
  canUseNws: boolean;
  hasSentAnyAlert: boolean;
}): FreezeReadinessResult {
  const { alertSettings, devices, latest, weatherCityId, canUseForecast, canUseNws, hasSentAnyAlert } =
    input;

  const stale: StaleSensorSummary = summarizeStaleSensors(latest, devices);
  const lowBattery = listLowBatteryDevices(devices, alertSettings.batteryThresholdPct);

  const channelOk =
    alertSettings.enabled &&
    ((alertSettings.channelEmail && Boolean(alertSettings.email?.trim())) ||
      (alertSettings.channelSms && Boolean(alertSettings.smsPhone?.trim())) ||
      (alertSettings.channelDiscord && Boolean(alertSettings.discordWebhookUrl?.trim())) ||
      (alertSettings.channelPush) ||
      (alertSettings.channelWebhook && Boolean(alertSettings.outboundWebhookUrl?.trim())) ||
      (alertSettings.channelTelegram &&
        Boolean(alertSettings.telegramBotToken?.trim() && alertSettings.telegramChatId?.trim())) ||
      (alertSettings.channelSlack && Boolean(alertSettings.slackWebhookUrl?.trim())) ||
      (alertSettings.channelTeams && Boolean(alertSettings.teamsWebhookUrl?.trim())) ||
      (alertSettings.channelNtfy && Boolean(alertSettings.ntfyTopic?.trim())) ||
      (alertSettings.channelPushover &&
        Boolean(alertSettings.pushoverUserKey?.trim() && alertSettings.pushoverAppToken?.trim())) ||
      (alertSettings.channelWhatsapp && Boolean(alertSettings.whatsappPhone?.trim())));

  const checks: ReadinessCheck[] = [
    {
      id: "alerts_on",
      label: "Freeze alerts enabled",
      ok: alertSettings.enabled,
      hint: alertSettings.enabled ? undefined : "Turn alerts on under Dashboard → Alerts.",
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
      id: "weather",
      label: "Weather / NWS location configured",
      ok: Boolean(weatherCityId?.trim()),
      hint: weatherCityId ? undefined : "Set your city in Dashboard → Settings for forecast/NWS alerts.",
    },
  ];

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
    ready: score >= 85 && checks.find((c) => c.id === "alerts_on")?.ok === true && channelOk,
  };
}
