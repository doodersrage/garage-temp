import { useState } from "preact/hooks";

interface Props {
  feedIds?: string[];
}

type FetchResult = {
  ok?: boolean;
  error?: string;
  feeds?: Array<{ feedId: string; name: string; ok: boolean; message: string }>;
};

export default function PullFetchButton({ feedIds = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (feedIds.length === 0) return null;

  function setFeedStatus(feedId: string, message: string, ok: boolean) {
    const el = document.querySelector<HTMLElement>(`[data-pull-fetch-status="${feedId}"]`);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("text-[var(--color-success)]", ok);
    el.classList.toggle("text-[var(--color-danger)]", !ok);
  }

  async function fetchNow() {
    setLoading(true);
    setStatus(null);
    for (const feedId of feedIds) {
      setFeedStatus(feedId, "Fetching…", true);
    }
    try {
      const response = await fetch("/api/devices/pull-fetch", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as FetchResult;
      if (!response.ok || !data.ok) {
        const message = data.error ?? "Fetch failed.";
        setStatus(message);
        for (const feedId of feedIds) {
          setFeedStatus(feedId, message, false);
        }
        return;
      }
      const byId = new Map((data.feeds ?? []).map((feed) => [feed.feedId, feed]));
      for (const feedId of feedIds) {
        const row = byId.get(feedId);
        if (row) {
          setFeedStatus(feedId, row.ok ? row.message : `Error: ${row.message}`, row.ok);
        } else {
          setFeedStatus(feedId, "Not fetched", false);
        }
      }
      setStatus("Fetch complete — refresh Home to see new readings.");
    } catch {
      setStatus("Could not fetch feeds.");
      for (const feedId of feedIds) {
        setFeedStatus(feedId, "Fetch failed", false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="btn-secondary" disabled={loading} onClick={() => void fetchNow()}>
        {loading ? "Fetching…" : "Fetch now"}
      </button>
      <span class="text-sm text-[var(--color-text-muted)]">
        Pull readings immediately instead of waiting for the next scheduled poll.
      </span>
      {status ? <span class="text-sm text-[var(--color-text-muted)]">{status}</span> : null}
    </div>
  );
}
