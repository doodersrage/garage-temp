export type NwsAlert = {
  event: string;
  headline: string;
  severity: string;
  expires: string | null;
};

export type NwsAlertSummary = {
  alerts: NwsAlert[];
  lat: number;
  lon: number;
};

/** Active US weather alerts from weather.gov (no API key). */
export async function fetchNwsAlerts(
  lat: number,
  lon: number,
): Promise<NwsAlertSummary | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": "ThermalTrace/1.0 (garage-temp.robmcd.name)",
      },
    });
    if (!response.ok) return null;

    const raw = (await response.json()) as {
      features?: Array<{
        properties?: {
          event?: string;
          headline?: string;
          severity?: string;
          expires?: string;
        };
      }>;
    };

    const alerts: NwsAlert[] = (raw.features ?? [])
      .map((f) => f.properties)
      .filter(Boolean)
      .map((p) => ({
        event: p!.event ?? "Alert",
        headline: p!.headline ?? "",
        severity: p!.severity ?? "Unknown",
        expires: p!.expires ?? null,
      }))
      .filter((a) =>
        /freeze|frost|cold|winter|ice|wind chill/i.test(`${a.event} ${a.headline}`),
      );

    return { alerts, lat, lon };
  } catch {
    return null;
  }
}

export function hasFreezeRelatedNwsAlert(summary: NwsAlertSummary | null): boolean {
  return (summary?.alerts.length ?? 0) > 0;
}
