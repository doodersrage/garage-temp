import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

type ProbeReading = {
  key: string;
  label: string;
  data: { f: number; c: number; h: number } | null;
};

type FeedGroup = {
  feedId: string;
  feedName: string;
  enabled: boolean;
  error?: string;
  probes: ProbeReading[];
};

type LiveSensor = {
  deviceId: string;
  deviceName: string;
  space?: string | null;
  key: string;
  label: string;
  kind: string;
  unit: string | null;
  value_num: number | null;
  value_bool: boolean | null;
  value_text: string | null;
  recorded_at: string | null;
  temp?: { f: number; c: number; h: number } | null;
};

interface Props {
  intervalMs?: number;
}

import { formatRelativeAge } from "../lib/relativeTime";
import { formatBoolSensorValue, SENSOR_KIND_LABELS } from "../lib/sensorKinds";

function formatSensorValue(sensor: LiveSensor): { primary: string; detail: string } {
  switch (sensor.kind) {
    case "temperature":
      if (sensor.temp) {
        return {
          primary: `${sensor.temp.f.toFixed(1)}°F`,
          detail: `${sensor.temp.c.toFixed(1)}°C · ${sensor.temp.h.toFixed(0)}% humidity`,
        };
      }
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num.toFixed(1)}${sensor.unit ? ` ${sensor.unit}` : "°F"}`,
          detail: sensor.deviceName,
        };
      }
      break;
    case "humidity":
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num.toFixed(0)}%`,
          detail: "Relative humidity",
        };
      }
      break;
    case "co2":
      if (sensor.value_num != null) {
        return {
          primary: `${Math.round(sensor.value_num)} ${sensor.unit ?? "ppm"}`,
          detail: "CO₂",
        };
      }
      break;
    case "pressure":
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num.toFixed(1)} ${sensor.unit ?? "hPa"}`,
          detail: "Barometric pressure",
        };
      }
      break;
    case "pm25":
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num.toFixed(1)} ${sensor.unit ?? "µg/m³"}`,
          detail: "Fine particles",
        };
      }
      break;
    case "voc":
      if (sensor.value_num != null) {
        return {
          primary: `${Math.round(sensor.value_num)} ${sensor.unit ?? "ppb"}`,
          detail: "VOCs",
        };
      }
      break;
    case "level":
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num.toFixed(0)}${sensor.unit ? ` ${sensor.unit}` : "%"}`,
          detail: "Sump / tank level",
        };
      }
      break;
    case "energy":
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num.toFixed(0)} ${sensor.unit ?? "W"}`,
          detail: "Power draw",
        };
      }
      break;
    case "door":
    case "power":
    case "flood":
    case "motion":
      return {
        primary:
          sensor.value_bool == null
            ? "—"
            : formatBoolSensorValue(sensor.kind, sensor.value_bool),
        detail: SENSOR_KIND_LABELS[sensor.kind as keyof typeof SENSOR_KIND_LABELS] ?? sensor.kind,
      };
    default:
      if (sensor.value_bool != null) {
        return {
          primary: sensor.value_bool ? "True" : "False",
          detail: sensor.kind,
        };
      }
      if (sensor.value_num != null) {
        return {
          primary: `${sensor.value_num}${sensor.unit ? ` ${sensor.unit}` : ""}`,
          detail: sensor.kind,
        };
      }
      if (sensor.value_text) {
        return { primary: sensor.value_text, detail: sensor.kind };
      }
  }

  return { primary: "—", detail: "No reading" };
}

function isSensorAlert(sensor: LiveSensor): boolean {
  if (sensor.kind === "door" && sensor.value_bool === true) return true;
  if (sensor.kind === "flood" && sensor.value_bool === true) return true;
  if (sensor.kind === "power" && sensor.value_bool === false) return true;
  if (sensor.kind === "motion" && sensor.value_bool === true) return true;
  if (sensor.kind === "co2" && sensor.value_num != null && sensor.value_num >= 1000) {
    return true;
  }
  if (sensor.kind === "pm25" && sensor.value_num != null && sensor.value_num >= 35) {
    return true;
  }
  if (sensor.kind === "voc" && sensor.value_num != null && sensor.value_num >= 400) {
    return true;
  }
  if (sensor.kind === "level" && sensor.value_num != null && sensor.value_num >= 80) {
    return true;
  }
  return false;
}

export default function LiveTempsPanel({ intervalMs = 30000 }: Props) {
  const [groups, setGroups] = useState<FeedGroup[]>([]);
  const [sensors, setSensors] = useState<LiveSensor[]>([]);
  const [spaces, setSpaces] = useState<string[]>([]);
  const [spaceFilter, setSpaceFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [offlineStale, setOfflineStale] = useState(false);

  const loadReadings = useCallback(async () => {
    try {
      const qs = spaceFilter
        ? `?space=${encodeURIComponent(spaceFilter)}`
        : "";
      const response = await fetch(`/api/home/readings${qs}`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Unable to refresh readings");
      }

      const payload = (await response.json()) as {
        groups: FeedGroup[];
        sensors?: LiveSensor[];
        spaces?: string[];
        updatedAt: string;
      };

      setGroups(payload.groups ?? []);
      setSensors(payload.sensors ?? []);
      if (payload.spaces) setSpaces(payload.spaces);
      setUpdatedAt(payload.updatedAt);
      setOfflineStale(response.headers.get("X-Garage-Temp-Stale") === "1");
      setError(null);
      setCountdown(intervalMs / 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }, [intervalMs, spaceFilter]);

  useEffect(() => {
    void loadReadings();
  }, [loadReadings]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/home/readings/stream");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "readings") void loadReadings();
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* SSE unavailable — polling fallback remains */
    }
    return () => es?.close();
  }, [loadReadings]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          void loadReadings();
          return intervalMs / 1000;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [intervalMs, loadReadings]);

  const nonTempSensors = useMemo(
    () => sensors.filter((s) => s.kind !== "temperature" && s.kind !== "humidity"),
    [sensors],
  );

  // Prefer kind-aware climate cards when present; fall back to feed groups
  const temperatureCards = useMemo(() => {
    return sensors.filter((s) => s.kind === "temperature" || s.kind === "humidity");
  }, [sensors]);

  const hasAnySensors =
    temperatureCards.length > 0 || groups.length > 0 || sensors.length > 0;

  if (loading && groups.length === 0 && sensors.length === 0) {
    return (
      <section class="card animate-slide-in-left">
        <p class="live-refresh-note m-0">Loading live readings…</p>
      </section>
    );
  }

  return (
    <section class="card animate-slide-in-left">
      <h2 class="card-title">Live sensors</h2>
      <p class="card-subtitle">
        Temperature, humidity, and other probes from pull feeds and push devices.
      </p>

      {spaces.length > 0 && (
        <div class="mb-4">
          <label class="form-label" for="space-filter">
            Space
          </label>
          <select
            id="space-filter"
            class="form-input"
            value={spaceFilter}
            onChange={(e) =>
              setSpaceFilter((e.target as HTMLSelectElement).value)
            }
          >
            <option value="">All spaces</option>
            {spaces.map((space) => (
              <option value={space} key={space}>
                {space}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div class="alert-warning mb-4">
          <p class="m-0">{error}</p>
          <button type="button" class="btn-secondary mt-3" onClick={() => void loadReadings()}>
            Retry now
          </button>
        </div>
      )}

      {temperatureCards.length > 0 ? (
        <div class="stat-grid mb-6">
          {temperatureCards.map((sensor) => {
            const display = formatSensorValue(sensor);
            const age = sensor.recorded_at
              ? formatRelativeAge(sensor.recorded_at)
              : null;
            return (
              <article
                class={`stat-item${age?.stale ? " stat-item-stale" : ""}`}
                key={`${sensor.deviceId}:${sensor.key}:temp`}
              >
                <span class="stat-label">{sensor.label}</span>
                <p class="stat-value">{display.primary}</p>
                <p class="stat-detail">
                  {display.detail}
                  {sensor.deviceName ? ` · ${sensor.deviceName}` : ""}
                </p>
                {age && (
                  <p class={`stat-detail m-0${age.stale ? " text-amber-300" : ""}`}>
                    {age.stale
                      ? `Stale · Updated ${age.label}`
                      : `Updated ${age.label}`}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : groups.length > 0 ? (
        <div class="feed-groups mb-6">
          {groups.map((group) => (
            <section class="feed-group" key={group.feedId}>
              <div class="feed-group-header">
                <h3 class="feed-group-title">{group.feedName}</h3>
                {!group.enabled && <span class="feed-group-badge">Disabled</span>}
              </div>

              {group.error && (
                <div class="alert-warning mb-4">
                  <p class="m-0">{group.error}</p>
                </div>
              )}

              {group.probes.length === 0 ? (
                <p class="stat-detail m-0">No probes assigned to this feed.</p>
              ) : (
                <div class="stat-grid">
                  {group.probes.map((probe) => (
                    <article class="stat-item" key={probe.key}>
                      <span class="stat-label">{probe.label}</span>
                      {probe.data ? (
                        <>
                          <p class="stat-value">{probe.data.f}°F</p>
                          <p class="stat-detail">
                            {probe.data.c}°C · {probe.data.h}% humidity
                          </p>
                        </>
                      ) : (
                        <p class="stat-detail">No reading for key "{probe.key}"</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : !hasAnySensors ? (
        <div class="empty-state">
          <p class="mb-4">No sensors available yet.</p>
          <a class="btn-primary" href="/dashboard/temperature">
            Configure devices
          </a>
        </div>
      ) : null}

      {nonTempSensors.length > 0 && (
        <>
          <h3 class="feed-group-title mb-3">Other sensors</h3>
          <div class="stat-grid">
            {nonTempSensors.map((sensor) => {
              const display = formatSensorValue(sensor);
              const age = sensor.recorded_at
                ? formatRelativeAge(sensor.recorded_at)
                : null;
              const alert = isSensorAlert(sensor);
              return (
                <article
                  class={`stat-item${age?.stale ? " stat-item-stale" : ""}${alert ? " stat-item-alert" : ""}`}
                  key={`${sensor.deviceId}:${sensor.key}:${sensor.kind}`}
                >
                  <span class="stat-label">{sensor.label}</span>
                  <p class={`stat-value${alert ? " text-[var(--color-danger)]" : ""}`}>
                    {display.primary}
                  </p>
                  <p class="stat-detail">
                    {display.detail} · {sensor.deviceName}
                  </p>
                  {age && (
                    <p class={`stat-detail m-0${age.stale ? " text-amber-300" : ""}`}>
                      {age.stale
                        ? `Stale · Updated ${age.label}`
                        : `Updated ${age.label}`}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      <p class="live-refresh-note">
        {offlineStale && (
          <span class="text-[var(--color-warning)]">Showing cached readings (offline). </span>
        )}
        {updatedAt
          ? `Updated ${new Date(updatedAt).toLocaleTimeString()}. Next refresh in ${countdown}s.`
          : `Next refresh in ${countdown}s.`}
      </p>
    </section>
  );
}
