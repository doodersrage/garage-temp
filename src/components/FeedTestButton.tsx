import { useState } from "preact/hooks";

interface Props {
  inputId: string;
}

export default function FeedTestButton({ inputId }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function testFeed() {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const url = input?.value.trim();

    if (!url) {
      setStatus("Enter a feed URL first.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/feeds/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { message?: string; ok?: boolean };
      setStatus(data.message ?? (data.ok ? "Feed OK" : "Feed test failed"));
    } catch {
      setStatus("Unable to test feed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="btn-secondary"
        onClick={testFeed}
        disabled={loading}
      >
        {loading ? "Testing…" : "Test feed URL"}
      </button>
      {status && <span class="text-sm text-[var(--color-text-muted)]">{status}</span>}
    </div>
  );
}
