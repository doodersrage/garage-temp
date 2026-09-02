import { useState } from "preact/hooks";

export type RenameSensorRow = {
  id: string;
  key: string;
  label: string;
  deviceName: string;
  kind: string;
};

interface Props {
  sensors: RenameSensorRow[];
  redirectTo?: string;
}

export default function SensorRenameBatch({
  sensors: initialSensors,
  redirectTo = "/dashboard/temperature",
}: Props) {
  const [sensors, setSensors] = useState(initialSensors);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (initialSensors.length === 0) return null;

  function acceptSuggested() {
    setSensors((current) =>
      current.map((sensor) => ({
        ...sensor,
        label: humanizeKey(sensor.key),
      })),
    );
    setStatus("Applied suggested names — edit below, then save.");
  }

  function updateLabel(index: number, label: string) {
    setSensors((current) =>
      current.map((sensor, sensorIndex) =>
        sensorIndex === index ? { ...sensor, label } : sensor,
      ),
    );
  }

  async function saveAll(event: Event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/devices/sensors-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensors: sensors.map((sensor) => ({ id: sensor.id, label: sensor.label })),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "Could not save sensor names.");
        return;
      }
      window.location.href = `${redirectTo}?sensors_renamed=1`;
    } catch {
      setStatus("Could not save sensor names.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form class="space-y-3" onSubmit={saveAll}>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-secondary" onClick={acceptSuggested}>
          Accept suggested names
        </button>
        <button type="submit" class="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save all names"}
        </button>
        {status ? <span class="text-sm text-[var(--color-text-muted)]">{status}</span> : null}
      </div>
      <div class="flex flex-col gap-2">
        {sensors.map((sensor, index) => (
          <div
            key={sensor.id}
            class="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] p-3"
          >
            <div class="form-field mb-0 min-w-[8rem]">
              <label class="form-label">Device</label>
              <div class="form-input bg-[var(--color-bg-muted)] text-sm">{sensor.deviceName}</div>
            </div>
            <div class="form-field mb-0 min-w-[6rem]">
              <label class="form-label">Key</label>
              <div class="form-input font-mono bg-[var(--color-bg-muted)] text-sm">{sensor.key}</div>
            </div>
            <div class="form-field mb-0 flex-1 min-w-[10rem]">
              <label class="form-label">Name on Home</label>
              <input
                class="form-input"
                type="text"
                value={sensor.label}
                required
                onInput={(event) =>
                  updateLabel(index, (event.currentTarget as HTMLInputElement).value)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}

function humanizeKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "Sensor";
  if (/^\d+$/.test(trimmed)) return `Probe ${trimmed}`;
  return trimmed
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
