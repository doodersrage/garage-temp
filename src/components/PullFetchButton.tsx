import { useState } from "preact/hooks";

interface Props {
  feedIds?: string[];
}

type FetchResult = {
  ok?: boolean;
  error?: string;
  feeds?: Array<{ name: string; ok: boolean; message: string }>;
};

export default function PullFetchButton({ feedIds = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (feedIds.length === 0) return null;

  async function fetchNow() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/devices/pull-fetch", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as FetchResult;
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Fetch failed.");
        return;
      }
      const parts =
        data.feeds?.map((feed) => `${feed.name}: ${feed.ok ? feed.message : "error"}`) ?? [];
      setStatus(parts.join(" · ") || "Fetched.");
      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch {
      setStatus("Could not fetch feeds.");
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
