import { useState } from "preact/hooks";

export type InlineSensorRow = {
  id: string;
  key: string;
  label: string;
  kind: string;
};

interface Props {
  deviceId: string;
  deviceName: string;
  sensors: InlineSensorRow[];
  highlight?: boolean;
}

export default function PushInlineRename({
  deviceName,
  sensors: initial,
  highlight = false,
}: Props) {
  const [sensors, setSensors] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (initial.length === 0) return null;

  function acceptSuggested() {
    setSensors((rows) =>
      rows.map((row) => ({
        ...row,
        label:
          /^Probe \d+$/.test(row.label) || row.label === humanize(row.key)
            ? humanize(row.key)
            : row.label,
      })),
    );
  }

  async function saveAll() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/devices/sensors-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensors: sensors.map((row) => ({ id: row.id, label: row.label })),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not save.");
        return;
      }
      setStatus("Saved.");
    } catch {
      setStatus("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const wrapperClass = [
    "rounded-lg border p-3 mb-4",
    highlight
      ? "border-[var(--color-accent)] bg-[var(--color-bg-muted)]"
      : "border-[var(--color-border)]",
  ].join(" ");

  return (
    <div class={wrapperClass}>
      <p class="m-0 mb-2 text-sm font-medium">
        {highlight ? "Rename auto-imported sensors" : "Quick rename"} · {deviceName}
      </p>
      <div class="flex flex-col gap-2">
        {sensors.map((row, index) => (
          <div class="flex flex-wrap items-end gap-2" key={row.id}>
            <code class="text-xs">{row.key}</code>
            <input
              class="form-input flex-1 min-w-[10rem]"
              type="text"
              value={row.label}
              onInput={(event) =>
                setSensors((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, label: (event.currentTarget as HTMLInputElement).value }
                      : item,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <button type="button" class="btn-secondary" onClick={acceptSuggested}>
          Accept suggested
        </button>
        <button type="button" class="btn-primary" disabled={saving} onClick={() => void saveAll()}>
          {saving ? "Saving…" : "Save names"}
        </button>
        {status ? <span class="text-sm text-[var(--color-text-muted)]">{status}</span> : null}
      </div>
    </div>
  );
}

function humanize(key: string): string {
  if (/^\d+$/.test(key)) return `Probe ${key}`;
  return key.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
