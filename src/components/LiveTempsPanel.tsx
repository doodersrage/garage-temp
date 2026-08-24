import { useCallback, useEffect, useState } from "preact/hooks";

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

interface Props {
  intervalMs?: number;
}

export default function LiveTempsPanel({ intervalMs = 90000 }: Props) {
  const [groups, setGroups] = useState<FeedGroup[]>([]);
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
        updatedAt: string;
      };

      setGroups(payload.groups);
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

  if (loading && groups.length === 0) {
    return (
      <section class="card animate-slide-in-left">
        <p class="live-refresh-note m-0">Loading live readings…</p>
      </section>
    );
  }

  return (
    <section class="card animate-slide-in-left">
      <h2 class="card-title">Garage Temperatures</h2>
      <p class="card-subtitle">
        Live readings from all temperature feeds and probes assigned in your dashboard.
      </p>

      {error && (
        <div class="alert-warning mb-4">
          <p class="m-0">{error}</p>
        </div>
      )}

      {groups.length === 0 ? (
        <div class="empty-state">
          <p>No feed groups are available. Check your dashboard feed and probe assignments.</p>
        </div>
      ) : (
        <div class="feed-groups">
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
      )}

      <p class="live-refresh-note">
        {updatedAt
          ? `Updated ${new Date(updatedAt).toLocaleTimeString()}. Next refresh in ${countdown}s.`
          : `Next refresh in ${countdown}s.`}
      </p>
    </section>
  );
}
