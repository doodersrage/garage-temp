import type { HouseContext } from "./houseContext";
import { fetchHouseContextForUser } from "./houseContext";
import type { RegionalBenchmark } from "./regionalBenchmark";
import { fetchRegionalBenchmark } from "./regionalBenchmark";
import { fetchLatestSensorValues } from "./sensorReadings";

export type MobileHousePayload = {
  source: "thermostat" | "reference_sensor";
  ambient_temp_f: number;
  heat_setpoint_f: number | null;
  hvac_mode: string | null;
  detail: string | null;
  reference_label: string | null;
};

export type MobileRegionalBenchmarkPayload = {
  city_label: string;
  your_temp_f: number;
  city_avg_temp_f: number | null;
  delta_f: number | null;
  message: string;
};

export function houseContextToMobilePayload(
  context: HouseContext,
): MobileHousePayload {
  return {
    source: context.source,
    ambient_temp_f: context.ambientTempF,
    heat_setpoint_f: context.thermostatSnapshot?.heatSetpointF ?? null,
    hvac_mode: context.thermostatSnapshot?.hvacMode ?? null,
    detail: context.metricDetail,
    reference_label: context.referenceLabel,
  };
}

export function regionalBenchmarkToMobilePayload(
  benchmark: RegionalBenchmark,
): MobileRegionalBenchmarkPayload {
  return {
    city_label: benchmark.cityLabel,
    your_temp_f: benchmark.yourTempF,
    city_avg_temp_f: benchmark.cityAvgTempF,
    delta_f: benchmark.deltaF,
    message: benchmark.message,
  };
}

export async function fetchMobileHousePayloadForUser(
  userId: string,
): Promise<MobileHousePayload | null> {
  const context = await fetchHouseContextForUser(userId);
  return context ? houseContextToMobilePayload(context) : null;
}

export async function fetchMobileRegionalBenchmarkForUser(
  userId: string,
): Promise<MobileRegionalBenchmarkPayload | null> {
  const householdId = await (await import("./households")).getUserHouseholdId(userId);
  if (!householdId) return null;

  const latest = await fetchLatestSensorValues(householdId);
  const coldest = latest
    .filter((row) => row.sensor.kind === "temperature" && row.value_num != null)
    .map((row) => row.value_num as number);
  if (coldest.length === 0) return null;

  const benchmark = await fetchRegionalBenchmark({
    householdId,
    yourTempF: Math.min(...coldest),
  });
  return benchmark ? regionalBenchmarkToMobilePayload(benchmark) : null;
}
