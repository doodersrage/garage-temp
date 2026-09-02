export type SensorThresholdOverride = {
  freezeThresholdF?: number;
  humidityThreshold?: number;
};

export type ThresholdSensorScope = {
  /** When non-empty, only these temperature sensor IDs trigger threshold alerts. */
  includedSensorIds: string[];
  overrides: Record<string, SensorThresholdOverride>;
};

export function parseThresholdSensorScope(raw: unknown): ThresholdSensorScope {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { includedSensorIds: [], overrides: {} };
  }
  const body = raw as Record<string, unknown>;
  const includedSensorIds = Array.isArray(body.includedSensorIds)
    ? body.includedSensorIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  const overrides: Record<string, SensorThresholdOverride> = {};
  if (body.overrides && typeof body.overrides === "object" && !Array.isArray(body.overrides)) {
    for (const [sensorId, value] of Object.entries(body.overrides as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const row = value as Record<string, unknown>;
      const entry: SensorThresholdOverride = {};
      if (typeof row.freezeThresholdF === "number" && Number.isFinite(row.freezeThresholdF)) {
        entry.freezeThresholdF = row.freezeThresholdF;
      }
      if (typeof row.humidityThreshold === "number" && Number.isFinite(row.humidityThreshold)) {
        entry.humidityThreshold = row.humidityThreshold;
      }
      if (Object.keys(entry).length > 0) {
        overrides[sensorId] = entry;
      }
    }
  }

  return { includedSensorIds, overrides };
}

export function freezeThresholdForReading(
  settings: { freezeThresholdF: number; thresholdSensorScope: ThresholdSensorScope },
  reading: { sensorId?: string },
): number {
  const override =
    reading.sensorId && settings.thresholdSensorScope.overrides[reading.sensorId]?.freezeThresholdF;
  return typeof override === "number" ? override : settings.freezeThresholdF;
}

export function humidityThresholdForReading(
  settings: { humidityThreshold: number; thresholdSensorScope: ThresholdSensorScope },
  reading: { sensorId?: string },
): number {
  const override =
    reading.sensorId && settings.thresholdSensorScope.overrides[reading.sensorId]?.humidityThreshold;
  return typeof override === "number" ? override : settings.humidityThreshold;
}

export function readingIncludedInThresholdAlerts(
  scope: ThresholdSensorScope,
  reading: { sensorId?: string },
): boolean {
  if (scope.includedSensorIds.length === 0) return true;
  return Boolean(reading.sensorId && scope.includedSensorIds.includes(reading.sensorId));
}
