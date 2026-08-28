/**
 * Optional thermostat outdoor/setpoint correlation (Nest / Ecobee stubs).
 * Set NEST_ACCESS_TOKEN or ECOBEE_ACCESS_TOKEN in Worker secrets to enable.
 */

export type ThermostatSnapshot = {
  provider: "nest" | "ecobee";
  ambientTempF: number | null;
  heatSetpointF: number | null;
  hvacMode: string | null;
};

export async function fetchNestSnapshot(
  accessToken: string,
): Promise<ThermostatSnapshot | null> {
  try {
    const res = await fetch(
      "https://smartdevicemanagement.googleapis.com/v1/enterprises/project-id/devices",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      devices?: Array<{
        traits?: Record<string, { ambientTemperatureCelsius?: number }>;
      }>;
    };
    const device = data.devices?.[0];
    const c = device?.traits?.["sdm.devices.traits.Temperature"]?.ambientTemperatureCelsius;
    return {
      provider: "nest",
      ambientTempF: c != null ? (c * 9) / 5 + 32 : null,
      heatSetpointF: null,
      hvacMode: null,
    };
  } catch {
    return null;
  }
}

export async function fetchEcobeeSnapshot(
  accessToken: string,
): Promise<ThermostatSnapshot | null> {
  try {
    const res = await fetch("https://api.ecobee.com/1/thermostat?json={}", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return {
      provider: "ecobee",
      ambientTempF: null,
      heatSetpointF: null,
      hvacMode: null,
    };
  } catch {
    return null;
  }
}

export async function fetchThermostatContext(): Promise<ThermostatSnapshot | null> {
  const nest = import.meta.env.NEST_ACCESS_TOKEN?.trim();
  if (nest) return fetchNestSnapshot(nest);
  const ecobee = import.meta.env.ECOBEE_ACCESS_TOKEN?.trim();
  if (ecobee) return fetchEcobeeSnapshot(ecobee);
  return null;
}
