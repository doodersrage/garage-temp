import { useState } from "preact/hooks";

interface Props {
  exampleFeedUrl: string;
  redirectTo?: string;
  buttonLabel?: string;
}

export default function DemoPullQuickStart({
  exampleFeedUrl,
  redirectTo = "/dashboard",
  buttonLabel = "Try demo feed",
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
      try {
        await fetch("/api/devices/pull-fetch", {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
      } catch {
        // Still land on Overview; scheduled poll will catch up.
      }
      const next = data.redirect ?? redirectTo;
      const joiner = next.includes("?") ? "&" : "?";
      window.location.href = `${next}${joiner}pull_saved=1&demo_pull=1`;
    } catch {
      setStatus("Could not save example feed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="btn-primary" disabled={loading} onClick={() => void startExampleFeed()}>
        {loading ? "Setting up…" : buttonLabel}
      </button>
      <span class="text-sm text-[var(--color-text-muted)]">
        Live weather JSON — no hardware required.
      </span>
      {status ? <span class="text-sm text-[var(--color-danger)]">{status}</span> : null}
    </div>
  );
}
