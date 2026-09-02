import { useEffect, useMemo, useState } from "preact/hooks";
import {
  applyProbeNoise,
  buildDemoFeedJson,
  buildDemoIngestJson,
  buildDemoSpaceStatus,
  computeAverageReading,
  computeDemoProbes,
  coldestProbeTempF,
  defaultDemoControls,
  DEMO_PRESETS,
  DEMO_SPACES,
  type DemoControls,
  type DemoPresetId,
  type DemoProbe,
  type DemoSpaceKind,
} from "../lib/probeDemo";

function formatHistoryTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

type JsonTab = "pull" | "push";

export default function ProbeDemo() {
  const [controls, setControls] = useState<DemoControls>(defaultDemoControls);
  const [probes, setProbes] = useState<DemoProbe[]>(() =>
    computeDemoProbes(defaultDemoControls),
  );
  const [average, setAverage] = useState(() =>
    computeAverageReading(computeDemoProbes(defaultDemoControls)),
  );
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [jsonTab, setJsonTab] = useState<JsonTab>("push");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const baseProbes = computeDemoProbes(controls);
    setProbes(baseProbes);
    setAverage(computeAverageReading(baseProbes));
    setLastUpdated(new Date());
  }, [controls]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const baseProbes = computeDemoProbes(controls);
      const { probes: nextProbes, average: nextAverage } =
        applyProbeNoise(baseProbes);
      setProbes(nextProbes);
      setAverage(nextAverage);
      setLastUpdated(new Date());
    }, 2000);

    return () => window.clearInterval(interval);
  }, [controls]);

  const pullJson = useMemo(
    () => buildDemoFeedJson(probes, average),
    [probes, average],
  );
  const pushJson = useMemo(
    () => buildDemoIngestJson(probes, average),
    [probes, average],
  );
  const activeJson = jsonTab === "push" ? pushJson : pullJson;
  const spaceStatus = useMemo(
    () => buildDemoSpaceStatus(probes, controls),
    [probes, controls],
  );
  const coldest = coldestProbeTempF(probes);
  const space = DEMO_SPACES[controls.space];
  const maxBarTemp = Math.max(
    ...probes.map((probe) => probe.reading.f),
    average.f,
    controls.freezeThresholdF + 5,
    1,
  );
  const freezeBarPct = Math.min(100, (controls.freezeThresholdF / maxBarTemp) * 100);

  function updateControl<K extends keyof DemoControls>(
    key: K,
    value: DemoControls[K],
  ) {
    setControls((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(id: DemoPresetId) {
    setControls((current) => ({
      ...current,
      ...DEMO_PRESETS[id].controls,
    }));
  }

  function resetDemo() {
    setControls(defaultDemoControls);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(activeJson);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(null), 2000);
    }
  }

  return (
    <div class="probe-demo">
      <section class="card">
        <h2 class="card-title">Probe conditions</h2>
        <p class="card-subtitle">
          Pick a space, tweak weather, and watch zones respond the way Overview and Devices do with
          live ingest.
        </p>

        <div class="probe-demo-presets" role="group" aria-label="Scenario presets">
          {(Object.keys(DEMO_PRESETS) as DemoPresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              class="btn-ghost"
              title={DEMO_PRESETS[id].hint}
              onClick={() => applyPreset(id)}
            >
              {DEMO_PRESETS[id].label}
            </button>
          ))}
        </div>

        <div class="probe-demo-controls">
          <label class="probe-demo-control">
            <span class="form-label">Monitored space</span>
            <select
              class="form-input"
              value={controls.space}
              onChange={(event) =>
                updateControl(
                  "space",
                  (event.currentTarget as HTMLSelectElement).value as DemoSpaceKind,
                )
              }
            >
              {(Object.keys(DEMO_SPACES) as DemoSpaceKind[]).map((id) => (
                <option value={id}>{DEMO_SPACES[id].label}</option>
              ))}
            </select>
          </label>

          <label class="probe-demo-control">
            <span class="form-label">Outdoor temperature ({controls.outdoorF} °F)</span>
            <input
              class="probe-demo-range"
              type="range"
              min={5}
              max={95}
              step={1}
              value={controls.outdoorF}
              onInput={(event) =>
                updateControl(
                  "outdoorF",
                  Number((event.currentTarget as HTMLInputElement).value),
                )
              }
            />
          </label>

          <label class="probe-demo-control">
            <span class="form-label">Sun / heat load ({controls.sunIntensity}%)</span>
            <input
              class="probe-demo-range"
              type="range"
              min={0}
              max={100}
              step={5}
              value={controls.sunIntensity}
              onInput={(event) =>
                updateControl(
                  "sunIntensity",
                  Number((event.currentTarget as HTMLInputElement).value),
                )
              }
            />
          </label>

          <label class="probe-demo-control">
            <span class="form-label">
              Freeze threshold ({controls.freezeThresholdF} °F)
            </span>
            <input
              class="probe-demo-range"
              type="range"
              min={20}
              max={45}
              step={0.5}
              value={controls.freezeThresholdF}
              onInput={(event) =>
                updateControl(
                  "freezeThresholdF",
                  Number((event.currentTarget as HTMLInputElement).value),
                )
              }
            />
          </label>

          <label class="checkbox-row probe-demo-toggle">
            <input
              type="checkbox"
              checked={controls.doorOpen}
              onChange={(event) =>
                updateControl(
                  "doorOpen",
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            <span>{space.doorLabel}</span>
          </label>
        </div>

        <div class="probe-demo-actions">
          <button class="btn-secondary" type="button" onClick={resetDemo}>
            Reset demo
          </button>
          <p class="probe-demo-updated m-0">
            Simulated refresh every 2 seconds · Last update {formatHistoryTime(lastUpdated)}
          </p>
        </div>
      </section>

      <section
        class={`card garage-risk-status garage-risk-status--${spaceStatus.level}`}
        aria-live="polite"
      >
        <p class="garage-risk-eyebrow">Space status (simulated)</p>
        <h2 class="card-title garage-risk-title">{spaceStatus.title}</h2>
        <p class="card-subtitle mb-2">{spaceStatus.detail}</p>
        {coldest != null && (
          <p class="text-sm text-[var(--color-text-muted)] mb-0">
            Coldest probe {coldest.toFixed(1)}°F · threshold {controls.freezeThresholdF}°F · outdoor{" "}
            {controls.outdoorF}°F
          </p>
        )}
        {spaceStatus.level === "risk" && (
          <p class="alert-warning mt-3 mb-0">
            In the real app this would fire your freeze essentials (email by default) — same logic as
            Overview’s space status card.
          </p>
        )}
      </section>

      <section class="card">
        <h2 class="card-title">Live probe readings</h2>
        <p class="card-subtitle">
          Each card mirrors a sensor label you’d rename on Devices after first POST.
        </p>

        <div class="stat-grid">
          {probes.map((probe) => {
            const atRisk = probe.reading.f <= controls.freezeThresholdF;
            const near =
              !atRisk && probe.reading.f <= controls.freezeThresholdF + 5;
            return (
              <article
                class={`stat-item${atRisk ? " probe-demo-stat--risk" : near ? " probe-demo-stat--watch" : ""}`}
                key={probe.key}
              >
                <span class="stat-label">
                  {probe.label}
                  <span class="probe-demo-key"> · {probe.ingestKey}</span>
                </span>
                <p class="stat-value m-0">{probe.reading.f.toFixed(1)} °F</p>
                <p class="stat-detail m-0">
                  {probe.reading.c.toFixed(1)} °C · {probe.reading.h.toFixed(1)}% humidity
                  {atRisk ? " · below freeze" : near ? " · near freeze" : ""}
                </p>
              </article>
            );
          })}
          <article class="stat-item">
            <span class="stat-label">Average · avg</span>
            <p class="stat-value m-0">{average.f.toFixed(1)} °F</p>
            <p class="stat-detail m-0">
              {average.c.toFixed(1)} °C · {average.h.toFixed(1)}% humidity
            </p>
          </article>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Probe comparison</h2>
        <p class="card-subtitle">
          Relative temperature by zone — dashed line is your freeze threshold.
        </p>
        <div class="probe-demo-bars" role="img" aria-label="Bar chart comparing probe temperatures">
          {probes.map((probe) => (
            <div class="probe-demo-bar-row" key={probe.key}>
              <span class="probe-demo-bar-label">{probe.label}</span>
              <div class="probe-demo-bar-track">
                <div
                  class={`probe-demo-bar-fill${
                    probe.reading.f <= controls.freezeThresholdF
                      ? " probe-demo-bar-fill--risk"
                      : ""
                  }`}
                  style={{ width: `${(probe.reading.f / maxBarTemp) * 100}%` }}
                />
                <span
                  class="probe-demo-bar-threshold"
                  style={{ left: `${freezeBarPct}%` }}
                  title={`Freeze ${controls.freezeThresholdF}°F`}
                />
              </div>
              <span class="probe-demo-bar-value">{probe.reading.f.toFixed(1)} °F</span>
            </div>
          ))}
        </div>
        <p class="mt-3 mb-0 text-sm text-[var(--color-text-muted)]">
          Vertical marks show the {controls.freezeThresholdF}°F freeze threshold on each bar.
        </p>
      </section>

      <section class="card">
        <h2 class="card-title">JSON feed preview</h2>
        <p class="card-subtitle mb-3">
          Push ingest is what ESP/Arduino POST to Devices. Pull nests the same named probes under
          <code>temp</code> for scheduled HTTPS JSON.
        </p>
        <div class="probe-demo-json-tabs" role="tablist" aria-label="JSON format">
          <button
            type="button"
            role="tab"
            class={jsonTab === "push" ? "btn-secondary ring-2 ring-[var(--color-accent)]" : "btn-ghost"}
            aria-selected={jsonTab === "push"}
            onClick={() => setJsonTab("push")}
          >
            Push ingest
          </button>
          <button
            type="button"
            role="tab"
            class={jsonTab === "pull" ? "btn-secondary ring-2 ring-[var(--color-accent)]" : "btn-ghost"}
            aria-selected={jsonTab === "pull"}
            onClick={() => setJsonTab("pull")}
          >
            Pull feed
          </button>
          <button type="button" class="btn-ghost" onClick={() => void copyJson()}>
            {copyStatus ?? "Copy JSON"}
          </button>
        </div>
        <pre class="probe-demo-json"><code>{activeJson}</code></pre>
      </section>

      <section class="card">
        <h2 class="card-title">Try this on real data</h2>
        <p class="card-subtitle mb-4">
          Same freeze essentials and ingest path as production — no need to finish the simulator first.
        </p>
        <div class="flex flex-wrap gap-3">
          <a class="btn-primary" href="/register?next=/dashboard/temperature">
            Create free account
          </a>
          <a class="btn-secondary" href="/dashboard">
            Overview + demo feed
          </a>
          <a class="btn-ghost" href="/about/adding-devices">
            Adding devices guide
          </a>
          <a class="btn-ghost" href="/dashboard/alerts#alert-section-essentials">
            Freeze + email essentials
          </a>
        </div>
      </section>
    </div>
  );
}
