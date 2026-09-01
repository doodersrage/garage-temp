import type { AlertSettings } from "./alerts";
import type { LatestSensorRow } from "./sensorReadings";
import { getRecentNumericReadingSamples } from "./sensorReadings";
import { fetchForecastMinTemp } from "./FetchWeather";
import { buildThermalRunway, formatRunwayAlertSuffix } from "./thermalRunway";
import { fetchRegionalBenchmark, formatBenchmarkAlertSuffix } from "./regionalBenchmark";
import { fetchThermostatAnnotationForHousehold } from "./thermostatCorrelation";

/** Extra lines appended to freeze threshold alert bodies (never suppresses alerts). */
export async function buildFreezeAlertContext(input: {
  householdId?: string | null;
  settings: AlertSettings;
  weatherCityId?: string | null;
  coldestTempF: number;
  coldestSensorId?: string | null;
  latestSensors?: LatestSensorRow[];
}): Promise<string | null> {
  const parts: string[] = [];

  const annotation = await fetchThermostatAnnotationForHousehold(input.householdId).catch(
    () => null,
  );
  if (annotation) parts.push(annotation);

  if (input.householdId && Number.isFinite(input.coldestTempF)) {
    const benchmark = await fetchRegionalBenchmark({
      householdId: input.householdId,
      yourTempF: input.coldestTempF,
    }).catch(() => null);
    const benchLine = formatBenchmarkAlertSuffix(benchmark);
    if (benchLine) parts.push(benchLine);
  }

  const doorOpenNearby =
    input.latestSensors?.some(
      (s) =>
        s.sensor.kind === "door" &&
        (s.value_bool === true || s.value_text === "open"),
    ) ?? false;

  if (input.coldestSensorId) {
    const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const samples = await getRecentNumericReadingSamples(input.coldestSensorId, since1h).catch(
      () => [],
    );

    const forecast = input.weatherCityId
      ? await fetchForecastMinTemp(input.weatherCityId, input.settings.forecastHoursAhead).catch(
          () => null,
        )
      : null;

    const runway = buildThermalRunway({
      currentTempF: input.coldestTempF,
      freezeThresholdF: input.settings.freezeThresholdF,
      recentSamples: samples,
      forecastMinTempF: forecast?.minTempF ?? null,
      forecastHoursAhead: input.settings.forecastHoursAhead,
      doorOpenNearby,
    });
    const runwayLine = formatRunwayAlertSuffix(runway);
    if (runwayLine) parts.push(runwayLine);
  } else if (doorOpenNearby) {
    parts.push("A door sensor is open — expect faster heat loss until it closes.");
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}
