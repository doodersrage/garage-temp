import { useState } from "preact/hooks";

interface Props {
  exampleFeedUrl: string;
  redirectTo?: string;
}

export default function DemoPullQuickStart({
  exampleFeedUrl,
  redirectTo = "/dashboard/temperature?tab=pull",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function startExampleFeed() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/user/pull-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect: redirectTo,
          feeds: [
            {
              id: "example-weather",
              name: "Example weather feed",
              url: exampleFeedUrl,
              enabled: true,
              jsonRoot: "temp",
            },
          ],
          probes: [],
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        redirect?: string;
      };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not save example feed.");
        return;
      }
      window.location.href = data.redirect ?? `${redirectTo}&pull_saved=1&demo_pull=1`;
    } catch {
      setStatus("Could not save example feed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="btn-primary" disabled={loading} onClick={() => void startExampleFeed()}>
        {loading ? "Setting up…" : "Try example pull feed"}
      </button>
      <span class="text-sm text-[var(--color-text-muted)]">
        Live weather JSON — no hardware required. Saves, discovers probes, then fetch readings.
      </span>
      {status ? <span class="text-sm text-[var(--color-danger)]">{status}</span> : null}
    </div>
  );
}
