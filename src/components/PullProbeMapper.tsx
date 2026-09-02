import { useMemo, useState } from "preact/hooks";
import type { TempFeedConfig, TempProbeConfig } from "../lib/tempFeedConfig";
import { mergeDiscoveredProbes, type DiscoveredProbe } from "../lib/feedDiscovery";

type DiscoveredProbeRow = {
  key: string;
  suggestedLabel: string;
  label: string;
  tempF: number | null;
  humidity: number | null;
  visible: boolean;
  source: string;
  reading: string;
};

type DiscoverResponse = {
  ok?: boolean;
  message?: string;
  format?: string;
  jsonRoot?: string;
  probes?: DiscoveredProbeRow[];
};

interface Props {
  feeds: TempFeedConfig[];
  probes: TempProbeConfig[];
  redirectTo?: string;
}

type EditableProbe = TempProbeConfig & { reading?: string };

export default function PullProbeMapper({
  feeds,
  probes: initialProbes,
  redirectTo = "/dashboard/temperature",
}: Props) {
  const [probes, setProbes] = useState<EditableProbe[]>(
    initialProbes.filter((probe) => Boolean(probe.key)),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [loadingFeedId, setLoadingFeedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const feedsWithUrls = useMemo(
    () => feeds.filter((feed) => Boolean(feed.url)),
    [feeds],
  );

  function readFeedFormValues(
    feed: TempFeedConfig,
  ): { url: string; jsonRoot: string; rootInput: HTMLInputElement | null } {
    const idInputs = document.querySelectorAll<HTMLInputElement>('input[name^="feed_"][name$="_id"]');
    for (const input of idInputs) {
      if (input.value !== feed.id) continue;
      const match = input.name.match(/^feed_(\d+)_id$/);
      if (!match) continue;
      const index = match[1];
      const urlInput = document.getElementById(`feed_${index}_url`) as HTMLInputElement | null;
      const rootInput = document.getElementById(`feed_${index}_json_root`) as HTMLInputElement | null;
      return {
        url: urlInput?.value.trim() || feed.url,
        jsonRoot: rootInput?.value.trim() || feed.jsonRoot || "temp",
        rootInput,
      };
    }
    return { url: feed.url, jsonRoot: feed.jsonRoot || "temp", rootInput: null };
  }

  async function discoverFeed(feed: TempFeedConfig) {
    const { url, jsonRoot, rootInput } = readFeedFormValues(feed);

    if (!url) {
      setStatus("Enter a feed URL first.");
      return;
    }

    setLoadingFeedId(feed.id);
    setStatus(null);

    try {
      const response = await fetch("/api/feeds/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, jsonRoot }),
      });
      const data = (await response.json()) as DiscoverResponse;
      if (!data.ok || !data.probes?.length) {
        setStatus(data.message ?? "No probes found in feed.");
        return;
      }

      if (rootInput && data.jsonRoot && data.jsonRoot !== jsonRoot) {
        rootInput.value = data.jsonRoot;
      }

      const merged = mergeDiscoveredProbes(
        probes,
        feed.id,
        data.probes as DiscoveredProbe[],
      );
      const readingByKey = new Map(
        data.probes.map((probe) => [probe.key, probe.reading]),
      );
      setProbes(
        merged.map((probe) => ({
          ...probe,
          reading: probe.feedId === feed.id ? readingByKey.get(probe.key) : undefined,
        })),
      );
      setStatus(
        data.message ??
          `Imported ${data.probes.length} probe${data.probes.length === 1 ? "" : "s"}. Rename below, then save.`,
      );
    } catch {
      setStatus("Unable to read feed.");
    } finally {
      setLoadingFeedId(null);
    }
  }

  function updateProbe(index: number, patch: Partial<EditableProbe>) {
    setProbes((current) =>
      current.map((probe, probeIndex) =>
        probeIndex === index ? { ...probe, ...patch } : probe,
      ),
    );
  }

  function removeProbe(index: number) {
    setProbes((current) => current.filter((_, probeIndex) => probeIndex !== index));
  }

  async function saveProbes(event: Event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/user/temp-probes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect: redirectTo,
          probes: probes.map((probe) => ({
            id: probe.id,
            feedId: probe.feedId,
            key: probe.key,
            label: probe.label,
            visible: probe.visible,
          })),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; redirect?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Failed to save probe labels.");
        return;
      }
      window.location.href = data.redirect ?? `${redirectTo}?probes_saved=1`;
    } catch {
      setStatus("Unable to save probe labels.");
    } finally {
      setSaving(false);
    }
  }

  if (feedsWithUrls.length === 0) {
    return (
      <p class="mb-0 text-sm text-[var(--color-text-muted)]">
        Save a feed URL first, then discover probe keys here.
      </p>
    );
  }

  return (
    <form class="space-y-4" onSubmit={saveProbes}>
      <div>
        <h3 class="text-base font-semibold m-0">Probe labels</h3>
        <p class="card-subtitle mb-0 mt-1">
          Discover probes from your feed JSON, then rename them for Home. Keys stay tied to the feed;
          you only edit display names.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        {feedsWithUrls.map((feed) => (
          <div
            key={feed.id}
            class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] p-3"
          >
            <span class="text-sm font-medium">{feed.name || feed.id}</span>
            <button
              type="button"
              class="btn-secondary"
              disabled={loadingFeedId === feed.id}
              onClick={() => discoverFeed(feed)}
            >
              {loadingFeedId === feed.id ? "Reading feed…" : "Discover from feed"}
            </button>
          </div>
        ))}
      </div>

      {probes.length > 0 ? (
        <div class="flex flex-col gap-3">
          {probes.map((probe, index) => {
            const feed = feedsWithUrls.find((item) => item.id === probe.feedId);
            return (
              <div class="sensor-map-row" key={`${probe.feedId}-${probe.key}-${probe.id}`}>
                <div class="sensor-map-primary">
                  <div class="form-field mb-0">
                    <label class="form-label">Feed</label>
                    <div class="form-input bg-[var(--color-bg-muted)]">
                      {feed?.name || probe.feedId}
                    </div>
                  </div>
                  <div class="form-field mb-0">
                    <label class="form-label">JSON key</label>
                    <div class="form-input font-mono bg-[var(--color-bg-muted)]">{probe.key}</div>
                  </div>
                  <div class="form-field mb-0">
                    <label class="form-label">Name on Home</label>
                    <input
                      class="form-input"
                      type="text"
                      value={probe.label}
                      required
                      onInput={(event) =>
                        updateProbe(index, {
                          label: (event.currentTarget as HTMLInputElement).value,
                        })
                      }
                    />
                  </div>
                  <div class="sensor-map-actions">
                    {probe.reading ? (
                      <span class="text-sm text-[var(--color-text-muted)]">{probe.reading}</span>
                    ) : null}
                    <label class="checkbox-row mb-0">
                      <input
                        type="checkbox"
                        checked={probe.visible}
                        onChange={(event) =>
                          updateProbe(index, {
                            visible: (event.currentTarget as HTMLInputElement).checked,
                          })
                        }
                      />
                      <span>Show on Home</span>
                    </label>
                    <button
                      type="button"
                      class="btn-ghost"
                      onClick={() => removeProbe(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p class="mb-0 text-sm text-[var(--color-text-muted)]">
          Click <strong>Discover from feed</strong> to import probe keys with live readings.
        </p>
      )}

      <div class="flex flex-wrap items-center gap-3">
        {probes.length > 0 ? (
          <button type="submit" class="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save probe labels"}
          </button>
        ) : null}
        {status ? <span class="text-sm text-[var(--color-text-muted)]">{status}</span> : null}
      </div>
    </form>
  );
}
