import { useCallback, useEffect, useState } from "preact/hooks";
import type { WeatherSnapshot } from "../lib/FetchWeather";

interface Props {
  cityId?: string | null;
  intervalMs?: number;
}

export default function WeatherPanel({ cityId = null, intervalMs = 300000 }: Props) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (cityId) params.set("cityId", cityId);
      const query = params.toString();
      const response = await fetch(`/api/home/weather${query ? `?${query}` : ""}`, {
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load weather");
      }
      setWeather(payload.weather as WeatherSnapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load weather");
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, load]);

  if (loading && !weather) {
    return (
      <section class="card animate-slide-in-right">
        <p class="live-refresh-note m-0">Loading outdoor weather…</p>
      </section>
    );
  }

  if (error && !weather) {
    return (
      <section class="card animate-slide-in-right">
        <div class="empty-state">
          <h2 class="card-title">Current Weather</h2>
          <p class="mb-4">{error}</p>
          <div class="flex flex-wrap justify-center gap-3">
            <button type="button" class="btn-secondary" onClick={() => {
              setLoading(true);
              void load();
            }}>
              Retry
            </button>
            <a class="btn-ghost" href="/dashboard#weather">
              Change location
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (!weather) return null;

  const locationLabel = `${weather.name}${weather.country ? `, ${weather.country}` : ""}`;
  const stats: Array<{ label: string; value: string; detail?: boolean }> = [
    { label: "Temperature", value: `${weather.temp}°F` },
    { label: "Humidity", value: `${weather.humidity}%` },
    { label: "Feels Like", value: `${weather.feelsLike}°F` },
    { label: "Wind Speed", value: `${weather.windSpeed} mph` },
  ];
  if (weather.windGust != null) {
    stats.push({ label: "Wind Gusts", value: `${weather.windGust} mph` });
  }
  stats.push(
    { label: "Cloud Cover", value: `${weather.cloudCover}%` },
    { label: "Condition", value: weather.description, detail: true },
  );

  return (
    <section class="card animate-slide-in-right">
      <h2 class="card-title">Current Weather</h2>
      <p class="card-subtitle">{locationLabel}</p>
      {error && (
        <div class="alert-warning mb-4">
          <p class="m-0">
            {error}{" "}
            <button
              type="button"
              class="text-link bg-transparent border-0 p-0 cursor-pointer"
              onClick={() => void load()}
            >
              Retry
            </button>
          </p>
        </div>
      )}
      <div class="stat-grid">
        {stats.map(({ label, value, detail }) => (
          <article class="stat-item" key={label}>
            <span class="stat-label">{label}</span>
            {detail ? (
              <p class="stat-value capitalize">{value}</p>
            ) : (
              <p class="stat-value">{value}</p>
            )}
          </article>
        ))}
      </div>
      <p class="live-refresh-note">
        Outdoor weather refreshes every few minutes.
        {" "}
        <button
          type="button"
          class="text-link bg-transparent border-0 p-0 cursor-pointer text-sm"
          onClick={() => void load()}
        >
          Refresh now
        </button>
      </p>
    </section>
  );
}
