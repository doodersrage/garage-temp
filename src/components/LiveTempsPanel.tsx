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
    case "door":
      return {
        primary:
          sensor.value_bool == null
            ? "—"
            : sensor.value_bool
              ? "Open"
              : "Closed",
        detail: "Door contact",
      };
    case "power":
      return {
        primary:
          sensor.value_bool == null
            ? "—"
            : sensor.value_bool
              ? "On"
              : "Off",
        detail: "Power / relay",
      };
    case "flood":
      return {
        primary:
          sensor.value_bool == null
            ? "—"
            : sensor.value_bool
              ? "Wet"
              : "Dry",
        detail: "Flood / leak",
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

export default function LiveTempsPanel({ intervalMs = 90000 }: Props) {
  const [groups, setGroups] = useState<FeedGroup[]>([]);
  const [sensors, setSensors] = useState<LiveSensor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadReadings = useCallback(async () => {
    try {
      const response = await fetch("/api/home/readings", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Unable to refresh readings");
      }

      const payload = (await response.json()) as {
        groups: FeedGroup[];
        sensors?: LiveSensor[];
        updatedAt: string;
      };

      setGroups(payload.groups ?? []);
      setSensors(payload.sensors ?? []);
      setUpdatedAt(payload.updatedAt);
      setError(null);
      setCountdown(intervalMs / 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }, [intervalMs]);

  useEffect(() => {
    void loadReadings();
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

  // Prefer kind-aware temperature cards when present; fall back to feed groups
  const temperatureCards = useMemo(() => {
    const temps = sensors.filter((s) => s.kind === "temperature");
    return temps;
  }, [sensors]);

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

      {error && (
        <div class="alert-warning mb-4">
          <p class="m-0">{error}</p>
        </div>
      )}

      {temperatureCards.length > 0 ? (
        <div class="stat-grid mb-6">
          {temperatureCards.map((sensor) => {
            const display = formatSensorValue(sensor);
            return (
              <article class="stat-item" key={`${sensor.deviceId}:${sensor.key}:temp`}>
                <span class="stat-label">{sensor.label}</span>
                <p class="stat-value">{display.primary}</p>
                <p class="stat-detail">
                  {display.detail}
                  {sensor.deviceName ? ` · ${sensor.deviceName}` : ""}
                </p>
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
      ) : (
        <div class="empty-state">
          <p>No sensors available. Configure devices in your dashboard.</p>
        </div>
      )}

      {nonTempSensors.length > 0 && (
        <>
          <h3 class="feed-group-title mb-3">Other sensors</h3>
          <div class="stat-grid">
            {nonTempSensors.map((sensor) => {
              const display = formatSensorValue(sensor);
              return (
                <article
                  class="stat-item"
                  key={`${sensor.deviceId}:${sensor.key}:${sensor.kind}`}
                >
                  <span class="stat-label">{sensor.label}</span>
                  <p class="stat-value">{display.primary}</p>
                  <p class="stat-detail">
                    {display.detail} · {sensor.deviceName}
                  </p>
                </article>
              );
            })}
          </div>
        </>
      )}

      <p class="live-refresh-note">
        {updatedAt
          ? `Updated ${new Date(updatedAt).toLocaleTimeString()}. Next refresh in ${countdown}s.`
          : `Next refresh in ${countdown}s.`}
      </p>
    </section>
  );
}
