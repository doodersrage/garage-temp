import type { DeviceWithSensors } from "./devices";
import type { LatestSensorRow } from "./sensorReadings";
import type { ThermostatSnapshot } from "./thermostatCorrelation";
import {
  formatThermostatMetricDetail,
  formatThermostatMetricValue,
} from "./thermostatCorrelation";
import { findReferenceSensorLabel } from "./indoorReference";
import type { ChartPoint } from "./garageTempsHistory";
import { fetchThermostatSnapshotChartPoints } from "./thermostatSnapshots";

export type HouseContext = {
  source: "thermostat" | "reference_sensor";
  ambientTempF: number;
  metricValue: string;
  metricDetail: string | null;
  referenceLabel: string | null;
  thermostatSnapshot: ThermostatSnapshot | null;
};

export function resolveReferenceSensorTempF(
  sensorId: string | null,
  latest: LatestSensorRow[],
): number | null {
  if (!sensorId) return null;
  const row = latest.find(
    (reading) =>
      reading.sensor.id === sensorId &&
      reading.value_num != null &&
      Number.isFinite(reading.value_num),
  );
  return row?.value_num ?? null;
}

export function buildHouseContext(input: {
  thermostatSnapshot: ThermostatSnapshot | null;
  referenceSensorId: string | null;
  latest: LatestSensorRow[];
  devices: DeviceWithSensors[];
}): HouseContext | null {
  if (input.thermostatSnapshot?.ambientTempF != null) {
    const ambientTempF = input.thermostatSnapshot.ambientTempF;
    return {
      source: "thermostat",
      ambientTempF,
      metricValue: formatThermostatMetricValue(input.thermostatSnapshot),
      metricDetail: formatThermostatMetricDetail(input.thermostatSnapshot),
      referenceLabel: null,
      thermostatSnapshot: input.thermostatSnapshot,
    };
  }

  const referenceTempF = resolveReferenceSensorTempF(
    input.referenceSensorId,
    input.latest,
  );
  if (referenceTempF == null) return null;

  const referenceLabel = findReferenceSensorLabel(
    input.devices,
    input.referenceSensorId,
  );

  return {
    source: "reference_sensor",
    ambientTempF: referenceTempF,
    metricValue: `${referenceTempF.toFixed(0)}°F`,
    metricDetail: referenceLabel ? `From ${referenceLabel}` : "Indoor reference probe",
    referenceLabel,
    thermostatSnapshot: null,
  };
}

export async function fetchReferenceSensorChartPoints(
  householdId: string,
  sensorId: string,
  days: number,
  filters: { from?: string; to?: string } = {},
): Promise<ChartPoint[]> {
  const supabase = (await import("./supabase")).createServerClient();
  const defaultFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const from = filters.from ?? defaultFrom;

  let query = supabase
    .from("sensor_readings")
    .select(
      `
      recorded_at,
      value_num,
      device_sensors!inner (
        id,
        label,
        kind
      )
    `,
    )
    .eq("household_id", householdId)
    .eq("device_sensors.id", sensorId)
    .eq("device_sensors.kind", "temperature")
    .gte("recorded_at", from)
    .order("recorded_at", { ascending: true });

  if (filters.to) {
    query = query.lte("recorded_at", filters.to);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchReferenceSensorChartPoints failed:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const label =
        (row.device_sensors as { label?: string } | null)?.label ?? "House";
      const tempf = row.value_num;
      if (tempf == null || !Number.isFinite(tempf)) return null;
      return {
        timestamp: row.recorded_at,
        tempf,
        humidity: 0,
        probeLabel: label,
      } satisfies ChartPoint;
    })
    .filter((point): point is ChartPoint => point != null);
}

export async function fetchHouseChartOverlay(input: {
  householdId: string;
  days: number;
  hasThermostatConnection: boolean;
  referenceSensorId: string | null;
  filters?: { from?: string; to?: string };
}): Promise<{ points: ChartPoint[]; source: "thermostat" | "reference" | null }> {
  if (input.hasThermostatConnection) {
    const points = await fetchThermostatSnapshotChartPoints(
      input.householdId,
      input.days,
      input.filters ?? {},
    );
    if (points.length >= 2) {
      return { points, source: "thermostat" };
    }
  }

  if (input.referenceSensorId) {
    const points = await fetchReferenceSensorChartPoints(
      input.householdId,
      input.referenceSensorId,
      input.days,
      input.filters ?? {},
    );
    if (points.length >= 2) {
      return { points, source: "reference" };
    }
  }

  return { points: [], source: null };
}

export async function fetchHouseContextForUser(
  userId: string,
): Promise<HouseContext | null> {
  const { getUserHouseholdId } = await import("./households");
  const { getUserEntitlements } = await import("./entitlements");
  const { listConnectionsForHousehold } = await import("./thermostatConnections");
  const { fetchThermostatContextWithStatus } = await import("./thermostatCorrelation");
  const { getIndoorReferenceSensorId } = await import("./indoorReference");
  const { fetchLatestSensorValues } = await import("./sensorReadings");
  const { listHouseholdDevices } = await import("./devices");

  const householdId = await getUserHouseholdId(userId);
  if (!householdId) return null;

  const entitlements = await getUserEntitlements(userId);
  let thermostatSnapshot: ThermostatSnapshot | null = null;
  if (entitlements.canUseThermostatIntegration) {
    const connections = await listConnectionsForHousehold(householdId);
    const connection = connections[0];
    if (connection) {
      const result = await fetchThermostatContextWithStatus(
        householdId,
        connection.provider,
      );
      thermostatSnapshot = result.snapshot;
    }
  }

  const [referenceSensorId, latest, devicesResult] = await Promise.all([
    getIndoorReferenceSensorId(householdId),
    fetchLatestSensorValues(householdId),
    listHouseholdDevices(householdId),
  ]);

  return buildHouseContext({
    thermostatSnapshot,
    referenceSensorId,
    latest,
    devices: devicesResult.devices,
  });
}
