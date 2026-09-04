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

export type NestSnapshotResult =
  | { ok: true; snapshot: ThermostatSnapshot }
  | {
      ok: false;
      status: number | null;
      reason: "no_project" | "http_error" | "network";
      errorCode?: "sdm_api_disabled" | "api_auth" | "api_error";
      activationUrl?: string;
    };

export type ThermostatFetchError =
  | "no_token"
  | "no_project"
  | "sdm_api_disabled"
  | "api_auth"
  | "api_error"
  | "network";

export type ThermostatContextResult = {
  snapshot: ThermostatSnapshot | null;
  fetchError?: ThermostatFetchError;
  /** Short operator hint when fetchError is set (no secrets). */
  fetchHint?: string;
};

function parseNestApiFailure(
  status: number,
  rawBody: string,
): Pick<Extract<NestSnapshotResult, { ok: false }>, "errorCode" | "activationUrl"> {
  if (status === 401 || status === 403) {
    if (
      rawBody.includes("SERVICE_DISABLED") ||
      rawBody.includes("Smart Device Management API has not been used")
    ) {
      const projectMatch = rawBody.match(/project[=:\s]+([0-9]+)/);
      const activationUrl = projectMatch
        ? `https://console.developers.google.com/apis/api/smartdevicemanagement.googleapis.com/overview?project=${projectMatch[1]}`
        : "https://console.cloud.google.com/apis/library/smartdevicemanagement.googleapis.com";
      return { errorCode: "sdm_api_disabled", activationUrl };
    }
    return { errorCode: "api_auth" };
  }
  return { errorCode: "api_error" };
}

function nestFetchFailureMessage(
  result: Extract<NestSnapshotResult, { ok: false }>,
): { fetchError: ThermostatFetchError; fetchHint: string } {
  if (result.reason === "no_project") {
    return {
      fetchError: "no_project",
      fetchHint: "NEST_PROJECT_ID is missing on this deployment.",
    };
  }
  if (result.reason === "network") {
    return {
      fetchError: "network",
      fetchHint: "Could not reach Google Nest, try again in a minute.",
    };
  }
  if (result.errorCode === "sdm_api_disabled") {
    return {
      fetchError: "sdm_api_disabled",
      fetchHint: result.activationUrl
        ? `Enable the Smart Device Management API in Google Cloud, then refresh: ${result.activationUrl}`
        : "Enable the Smart Device Management API in the Google Cloud project that owns your Nest OAuth client.",
    };
  }
  if (result.errorCode === "api_auth") {
    return {
      fetchError: "api_auth",
      fetchHint: "Nest authorization may have expired, try Disconnect, then Connect again.",
    };
  }
  return {
    fetchError: "api_error",
    fetchHint: "Nest returned an error, try again or reconnect.",
  };
}

function nestDevicesUrl(projectId: string): string {
  return `https://smartdevicemanagement.googleapis.com/v1/enterprises/${encodeURIComponent(projectId)}/devices`;
}

function snapshotFromNestDevice(device: NestDevice | undefined): ThermostatSnapshot {
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
}

export async function fetchNestSnapshotDetailed(
  accessToken: string,
): Promise<NestSnapshotResult> {
  const projectId = getRuntimeEnv("NEST_PROJECT_ID")?.trim();
  if (!projectId) return { ok: false, status: null, reason: "no_project" };

  try {
    const res = await fetch(nestDevicesUrl(projectId), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const rawBody = await res.text();
      // Rate limits and upstream 5xx are transient — cron should soft-skip, not page ops.
      if (res.status === 429 || res.status >= 500) {
        return { ok: false, status: res.status, reason: "network" };
      }
      return {
        ok: false,
        status: res.status,
        reason: "http_error",
        ...parseNestApiFailure(res.status, rawBody),
      };
    }
    const data = JSON.parse(await res.text()) as { devices?: NestDevice[] };
    const device = pickNestThermostatDevice(data.devices ?? []);
    return { ok: true, snapshot: snapshotFromNestDevice(device) };
  } catch {
    return { ok: false, status: null, reason: "network" };
  }
}

export async function fetchNestSnapshot(
  accessToken: string,
): Promise<ThermostatSnapshot | null> {
  const result = await fetchNestSnapshotDetailed(accessToken);
  return result.ok ? result.snapshot : null;
}

export async function fetchEcobeeSnapshot(
  accessToken: string,
): Promise<ThermostatSnapshot | null> {
  const result = await fetchEcobeeSnapshotDetailed(accessToken);
  return result.ok ? result.snapshot : null;
}

export type EcobeeSnapshotResult =
  | { ok: true; snapshot: ThermostatSnapshot }
  | { ok: false; reason: "http_error" | "network" };

export async function fetchEcobeeSnapshotDetailed(
  accessToken: string,
): Promise<EcobeeSnapshotResult> {
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
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) {
        return { ok: false, reason: "network" };
      }
      return { ok: false, reason: "http_error" };
    }
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
      ok: true,
      snapshot: {
        provider: "ecobee",
        ambientTempF: actual != null ? actual / 10 : null,
        heatSetpointF: desiredHeat != null ? desiredHeat / 10 : null,
        hvacMode: thermostat?.settings?.hvacMode ?? null,
      },
    };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Live thermostat snapshot for a household, or null if not connected / unreachable. */
export async function fetchThermostatContextWithStatus(
  householdId: string,
  provider: "nest" | "ecobee",
): Promise<ThermostatContextResult> {
  const { resolveAccessTokenForHousehold, forceRefreshAccessTokenForHousehold } =
    await import("./thermostatOAuth");
  const accessToken = await resolveAccessTokenForHousehold(householdId, provider);
  if (!accessToken) {
    return {
      snapshot: null,
      fetchError: "no_token",
      fetchHint: "Reconnect your thermostat to restore access.",
    };
  }

  if (provider === "ecobee") {
    let ecobee = await fetchEcobeeSnapshotDetailed(accessToken);
    if (ecobee.ok) return { snapshot: ecobee.snapshot };
    if (ecobee.reason === "network") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      ecobee = await fetchEcobeeSnapshotDetailed(accessToken);
      if (ecobee.ok) return { snapshot: ecobee.snapshot };
      return {
        snapshot: null,
        fetchError: "network",
        fetchHint: "Could not reach Ecobee, try again in a minute.",
      };
    }
    return {
      snapshot: null,
      fetchError: "api_error",
      fetchHint: "Could not reach Ecobee, try again or reconnect.",
    };
  }

  let result = await fetchNestSnapshotDetailed(accessToken);
  if (result.ok) return { snapshot: result.snapshot };

  if (result.reason === "network") {
    await new Promise((resolve) => setTimeout(resolve, 400));
    result = await fetchNestSnapshotDetailed(accessToken);
    if (result.ok) return { snapshot: result.snapshot };
  }

  if (result.status === 401 || result.status === 403) {
    const refreshed = await forceRefreshAccessTokenForHousehold(householdId, "nest");
    if (refreshed) {
      result = await fetchNestSnapshotDetailed(refreshed);
      if (result.ok) return { snapshot: result.snapshot };
    }
  }

  const { fetchError, fetchHint } = nestFetchFailureMessage(result);
  return { snapshot: null, fetchError, fetchHint };
}

export async function fetchThermostatContext(
  householdId: string,
  provider: "nest" | "ecobee",
): Promise<ThermostatSnapshot | null> {
  const result = await fetchThermostatContextWithStatus(householdId, provider);
  return result.snapshot;
}

const HEATING_MODES = new Set(["HEAT", "HEATCOOL", "heat", "auxHeatOnly"]);
const COOLING_MODES = new Set(["COOL", "cool"]);

export function formatThermostatMode(mode: string | null): string | null {
  if (!mode) return null;
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
}

/** Overview Status metric: whole °F when available. */
export function formatThermostatMetricValue(snapshot: ThermostatSnapshot): string {
  return snapshot.ambientTempF != null ? `${snapshot.ambientTempF.toFixed(0)}°F` : "—";
}

/** Subline for Status metric, e.g. "Cool · set 80°F". */
export function formatThermostatMetricDetail(snapshot: ThermostatSnapshot): string | null {
  const parts: string[] = [];
  const mode = formatThermostatMode(snapshot.hvacMode);
  if (mode) parts.push(mode);
  if (snapshot.heatSetpointF != null) {
    parts.push(`set ${snapshot.heatSetpointF.toFixed(0)}°F`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function isThermostatHeating(mode: string | null): boolean {
  return mode ? HEATING_MODES.has(mode) : false;
}

export function isThermostatCooling(mode: string | null): boolean {
  return mode ? COOLING_MODES.has(mode) : false;
}

/**
 * Short, informational suffix for a freeze-alert message -- never used to
 * suppress or delay the alert itself, only to explain it. See the plan's
 * "annotate, don't suppress" note: a probe reading below the freeze
 * threshold is real regardless of what an unrelated house thermostat says.
 */
export function buildThermostatAnnotation(snapshot: ThermostatSnapshot | null): string | null {
  if (!snapshot || snapshot.ambientTempF == null) return null;
  const isHeating = snapshot.hvacMode ? HEATING_MODES.has(snapshot.hvacMode) : false;
  const isCooling = snapshot.hvacMode ? COOLING_MODES.has(snapshot.hvacMode) : false;
  const parts = [`House thermostat: ${snapshot.ambientTempF.toFixed(0)}°F`];
  if (snapshot.heatSetpointF != null) {
    parts.push(`set to ${snapshot.heatSetpointF.toFixed(0)}°F`);
  }
  if (isHeating) {
    parts.push("actively heating");
  } else if (isCooling) {
    parts.push("actively cooling");
  } else {
    parts.push("not actively heating");
  }
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
