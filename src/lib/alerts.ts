export type AlertSettings = {
  enabled: boolean;
  freezeThresholdF: number;
  humidityThreshold: number;
  email: string | null;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: false,
  freezeThresholdF: 34,
  humidityThreshold: 75,
  email: null,
};

export function getAlertSettingsFromMetadata(
  metadata: Record<string, unknown> | undefined,
): AlertSettings {
  if (!metadata?.alert_settings || typeof metadata.alert_settings !== "object") {
    return DEFAULT_ALERT_SETTINGS;
  }

  const raw = metadata.alert_settings as Record<string, unknown>;

  return {
    enabled: raw.enabled === true,
    freezeThresholdF:
      typeof raw.freeze_threshold_f === "number"
        ? raw.freeze_threshold_f
        : DEFAULT_ALERT_SETTINGS.freezeThresholdF,
    humidityThreshold:
      typeof raw.humidity_threshold === "number"
        ? raw.humidity_threshold
        : DEFAULT_ALERT_SETTINGS.humidityThreshold,
    email: typeof raw.email === "string" ? raw.email : null,
  };
}

export type AlertReading = {
  label: string;
  tempf: number;
  humidity: number;
};

export function evaluateAlerts(
  settings: AlertSettings,
  readings: AlertReading[],
): string[] {
  if (!settings.enabled) {
    return [];
  }

  const messages: string[] = [];

  for (const reading of readings) {
    if (reading.tempf <= settings.freezeThresholdF) {
      messages.push(
        `${reading.label} is ${reading.tempf.toFixed(1)}°F (at or below freeze threshold ${settings.freezeThresholdF}°F).`,
      );
    }

    if (reading.humidity >= settings.humidityThreshold) {
      messages.push(
        `${reading.label} humidity is ${reading.humidity.toFixed(0)}% (above threshold ${settings.humidityThreshold}%).`,
      );
    }
  }

  return messages;
}
