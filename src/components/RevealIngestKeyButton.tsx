import { useState } from "preact/hooks";

interface Props {
  deviceId: string;
  deviceName: string;
}

export default function RevealIngestKeyButton({ deviceId, deviceName }: Props) {
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const response = await fetch("/api/devices/reveal-ingest-key", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = (await response.json()) as { ok?: boolean; ingest_key?: string; error?: string };
      if (!response.ok || !data.ok || !data.ingest_key) {
      setError(
        data.error ??
          "Could not reveal key. If recovery is disabled on this server, use Rotate key on the device card.",
      );
        return;
      }
      setKey(data.ingest_key);
    } catch {
      setError(
        "Could not reveal key. If recovery is disabled, Rotate key on the device card for a new ingest URL.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div class="inline-flex flex-col gap-1">
      <button type="button" class="btn-secondary" disabled={loading} onClick={() => void reveal()}>
        {loading ? "Loading…" : key ? "Key shown below" : "Reveal ingest key"}
      </button>
      {key ? (
        <div class="flex flex-wrap items-center gap-2">
          <p
            class="m-0 text-xs font-mono break-all text-[var(--color-text-muted)]"
            aria-label={`Ingest key for ${deviceName}`}
          >
            {key}
          </p>
          <button type="button" class="btn-ghost text-xs" onClick={() => void copyKey()}>
            {copied ? "Copied" : "Copy key"}
          </button>
        </div>
      ) : null}
      {error ? <p class="m-0 text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
