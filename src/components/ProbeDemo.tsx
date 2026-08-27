import { useEffect, useMemo, useState } from "preact/hooks";
import {
  applyProbeNoise,
  buildDemoFeedJson,
  computeAverageReading,
  computeDemoProbes,
  defaultDemoControls,
  type DemoControls,
  type DemoProbe,
} from "../lib/probeDemo";

function formatHistoryTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ProbeDemo() {
  const [controls, setControls] = useState<DemoControls>(defaultDemoControls);
  const [probes, setProbes] = useState<DemoProbe[]>(() =>
    computeDemoProbes(defaultDemoControls),
  );
  const [average, setAverage] = useState(() =>
    computeAverageReading(computeDemoProbes(defaultDemoControls)),
  );
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

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

  const feedJson = useMemo(
    () => buildDemoFeedJson(probes, average),
    [probes, average],
  );

  const maxBarTemp = Math.max(...probes.map((probe) => probe.reading.f), average.f, 1);

  function updateControl<K extends keyof DemoControls>(
    key: K,
    value: DemoControls[K],
  ) {
    setControls((current) => ({ ...current, [key]: value }));
  }

  function resetDemo() {
    setControls(defaultDemoControls);
  }

  return (
    <div class="probe-demo">
      <section class="rounded-xl border border-border bg-card p-4 md:p-6 shadow-[var(--shadow-card)]">
        <h2 class="card-title">Garage conditions</h2>
        <p class="card-subtitle">
          Adjust the environment and watch three probe zones respond, just like the live JSON feed on the home page.
        </p>

        <div class="probe-demo-controls">
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
            <span class="form-label">Sun on roof ({controls.sunIntensity}%)</span>
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
            <span>Garage door open (mixes outside air into the door zone)</span>
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

      <section class="rounded-xl border border-border bg-card p-4 md:p-6 shadow-[var(--shadow-card)]">
        <h2 class="card-title">Live probe readings</h2>
        <p class="card-subtitle">Each card mirrors a probe key in the JSON feed below.</p>

        <div class="stat-grid">
          {probes.map((probe) => (
            <article class="stat-item" key={probe.key}>
              <span class="stat-label">
                Probe {probe.key} · {probe.label}
              </span>
              <p class="stat-value m-0">{probe.reading.f.toFixed(1)} °F</p>
              <p class="stat-detail m-0">
                {probe.reading.c.toFixed(1)} °C · {probe.reading.h.toFixed(1)}% humidity
              </p>
            </article>
          ))}
          <article class="stat-item">
            <span class="stat-label">Average · avg</span>
            <p class="stat-value m-0">{average.f.toFixed(1)} °F</p>
            <p class="stat-detail m-0">
              {average.c.toFixed(1)} °C · {average.h.toFixed(1)}% humidity
            </p>
          </article>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-card p-4 md:p-6 shadow-[var(--shadow-card)]">
        <h2 class="card-title">Probe comparison</h2>
        <p class="card-subtitle">Relative temperature by zone for the current simulation.</p>
        <div class="probe-demo-bars" role="img" aria-label="Bar chart comparing probe temperatures">
          {probes.map((probe) => (
            <div class="probe-demo-bar-row" key={probe.key}>
              <span class="probe-demo-bar-label">{probe.label}</span>
              <div class="probe-demo-bar-track">
                <div
                  class="probe-demo-bar-fill"
                  style={{ width: `${(probe.reading.f / maxBarTemp) * 100}%` }}
                />
              </div>
              <span class="probe-demo-bar-value">{probe.reading.f.toFixed(1)} °F</span>
            </div>
          ))}
        </div>
      </section>

      <section class="rounded-xl border border-border bg-card p-4 md:p-6 shadow-[var(--shadow-card)]">
        <h2 class="card-title">JSON feed preview</h2>
        <p class="card-subtitle">
          This is the shape returned by the Arduino sketch and consumed by the website fetch layer.
        </p>
        <pre class="probe-demo-json"><code>{feedJson}</code></pre>
      </section>
    </div>
  );
}
