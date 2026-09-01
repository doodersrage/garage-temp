/**
 * Per-household thermostat outdoor/setpoint correlation (Nest / Ecobee).
 * Reads the household's connected access token via thermostatOAuth.ts,
 * which reads/refreshes it from the per-household connection stored in
 * thermostatConnections.ts -- there is no global/site-wide credential here.
 */
import { getRuntimeEnv } from "./runtimeEnv";

export type ThermostatSnapshot = {
  provider: "nest" | "ecobee";
  ambientTempF: number | null;
  heatSetpointF: number | null;
  hvacMode: string | null;
};

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

type NestDeviceTraits = {
  "sdm.devices.traits.Temperature"?: { ambientTemperatureCelsius?: number };
  "sdm.devices.traits.ThermostatTemperatureSetpoint"?: {
    heatCelsius?: number;
    coolCelsius?: number;
  };
  "sdm.devices.traits.ThermostatMode"?: { mode?: string };
};

type NestDevice = {
  type?: string;
  traits?: NestDeviceTraits;
};

function pickNestThermostatDevice(devices: NestDevice[]): NestDevice | undefined {
  return (
    devices.find((d) => d.type === "sdm.devices.types.THERMOSTAT") ??
    devices.find((d) => d.traits?.["sdm.devices.traits.Temperature"]) ??
    devices[0]
  );
}

export async function fetchNestSnapshot(
  accessToken: string,
): Promise<ThermostatSnapshot | null> {
  const projectId = getRuntimeEnv("NEST_PROJECT_ID")?.trim();
  if (!projectId) return null;

  try {
    const res = await fetch(
      `https://smartdevicemanagement.googleapis.com/v1/enterprises/${encodeURIComponent(projectId)}/devices`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { devices?: NestDevice[] };
    const device = pickNestThermostatDevice(data.devices ?? []);
    const traits = device?.traits;
    const ambientC = traits?.["sdm.devices.traits.Temperature"]?.ambientTemperatureCelsius;
    const setpoint = traits?.["sdm.devices.traits.ThermostatTemperatureSetpoint"];
    const heatC = setpoint?.heatCelsius ?? setpoint?.coolCelsius;
    const mode = traits?.["sdm.devices.traits.ThermostatMode"]?.mode ?? null;
    return {
      provider: "nest",
      ambientTempF: ambientC != null ? celsiusToFahrenheit(ambientC) : null,
      heatSetpointF: heatC != null ? celsiusToFahrenheit(heatC) : null,
      hvacMode: mode,
    };
  } catch {
    return null;
  }
}

export async function fetchEcobeeSnapshot(
  accessToken: string,
): Promise<ThermostatSnapshot | null> {
  try {
    const selection = encodeURIComponent(
      JSON.stringify({
        selection: {
          selectionType: "registered",
          selectionMatch: "",
          includeRuntime: true,
          includeSettings: true,
        },
      }),
    );
    const res = await fetch(`https://api.ecobee.com/1/thermostat?json=${selection}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      thermostatList?: Array<{
        runtime?: { actualTemperature?: number; desiredHeat?: number };
        settings?: { hvacMode?: string };
      }>;
    };
    const thermostat = data.thermostatList?.[0];
    // Ecobee reports temperatures in tenths of a degree F.
    const actual = thermostat?.runtime?.actualTemperature;
    const desiredHeat = thermostat?.runtime?.desiredHeat;
    return {
      provider: "ecobee",
      ambientTempF: actual != null ? actual / 10 : null,
      heatSetpointF: desiredHeat != null ? desiredHeat / 10 : null,
      hvacMode: thermostat?.settings?.hvacMode ?? null,
    };
  } catch {
    return null;
  }
}

/** Live thermostat snapshot for a household, or null if not connected / unreachable. */
export async function fetchThermostatContext(
  householdId: string,
  provider: "nest" | "ecobee",
): Promise<ThermostatSnapshot | null> {
  const { resolveAccessTokenForHousehold } = await import("./thermostatOAuth");
  const accessToken = await resolveAccessTokenForHousehold(householdId, provider);
  if (!accessToken) return null;
  return provider === "nest"
    ? fetchNestSnapshot(accessToken)
    : fetchEcobeeSnapshot(accessToken);
}

const HEATING_MODES = new Set(["HEAT", "HEATCOOL", "heat", "auxHeatOnly"]);

/**
 * Short, informational suffix for a freeze-alert message -- never used to
 * suppress or delay the alert itself, only to explain it. See the plan's
 * "annotate, don't suppress" note: a probe reading below the freeze
 * threshold is real regardless of what an unrelated house thermostat says.
 */
export function buildThermostatAnnotation(snapshot: ThermostatSnapshot | null): string | null {
  if (!snapshot || snapshot.ambientTempF == null) return null;
  const isHeating = snapshot.hvacMode ? HEATING_MODES.has(snapshot.hvacMode) : false;
  const parts = [`House thermostat: ${snapshot.ambientTempF.toFixed(0)}°F`];
  if (snapshot.heatSetpointF != null) {
    parts.push(`set to ${snapshot.heatSetpointF.toFixed(0)}°F`);
  }
  parts.push(isHeating ? "actively heating" : "not actively heating");
  return `${parts.join(", ")} -- this alert is from an unconditioned space and is expected to run colder.`;
}

/**
 * Look up a household's connected thermostat (if any) and build the
 * freeze-alert annotation in one call. Used by alertNotifications.ts right
 * before sending an already-decided-on alert -- never to decide whether to
 * send one. Fails closed (returns null) on any lookup/fetch error so a
 * thermostat-API hiccup can never block or delay the underlying alert.
 */
export async function fetchThermostatAnnotationForHousehold(
  householdId: string | null | undefined,
): Promise<string | null> {
  if (!householdId) return null;
  try {
    const { listConnectionsForHousehold } = await import("./thermostatConnections");
    const connections = await listConnectionsForHousehold(householdId);
    const connection = connections[0];
    if (!connection) return null;
    const snapshot = await fetchThermostatContext(householdId, connection.provider);
    return buildThermostatAnnotation(snapshot);
  } catch {
    return null;
  }
}
