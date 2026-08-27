import { useEffect, useRef } from "preact/hooks";

type Point = {
  timestamp: string;
  tempf: number;
  humidity: number;
  probeLabel: string;
};

interface Props {
  points: Point[];
  priorYearPoints?: Point[];
  title?: string;
}

const PROBE_COLORS = ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185"];

export default function HistoryChart({
  points,
  priorYearPoints = [],
  title = "Temperature trend (last 7 days)",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeLabels = [...new Set(points.map((p) => p.probeLabel || "Probe"))];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { top: 16, right: 16, bottom: 28, left: 44 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const sortedPoints = [...points].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );
    const minTs = Date.parse(sortedPoints[0]!.timestamp);
    const maxTs = Date.parse(sortedPoints[sortedPoints.length - 1]!.timestamp);
    const tsRange = maxTs - minTs || 1;

    const allTemps = [
      ...points.map((p) => p.tempf),
      ...priorYearPoints.map((p) => p.tempf),
    ];
    const min = Math.min(...allTemps) - 2;
    const max = Math.max(...allTemps) + 2;
    const range = max - min || 1;

    g.clearRect(0, 0, width, height);
    g.fillStyle = "#151b24";
    g.fillRect(0, 0, width, height);

    g.strokeStyle = "rgba(255,255,255,0.06)";
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (innerH / 4) * i;
      g.beginPath();
      g.moveTo(pad.left, y);
      g.lineTo(width - pad.right, y);
      g.stroke();
      const val = max - (range / 4) * i;
      g.fillStyle = "#94a3b8";
      g.font = "10px system-ui, sans-serif";
      g.textAlign = "right";
      g.fillText(`${val.toFixed(0)}°F`, pad.left - 6, y + 3);
    }

    function drawSeries(series: Point[], color: string) {
      if (series.length < 2) return;
      const ordered = [...series].sort(
        (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
      );
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.beginPath();
      ordered.forEach((point, i) => {
        const x =
          pad.left +
          ((Date.parse(point.timestamp) - minTs) / tsRange) * innerW;
        const y = pad.top + innerH - ((point.tempf - min) / range) * innerH;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
    }

    if (priorYearPoints.length >= 2) {
      drawSeries(priorYearPoints, "rgba(148, 163, 184, 0.55)");
    }

    const byProbe = new Map<string, Point[]>();
    for (const point of points) {
      const label = point.probeLabel || "Probe";
      const list = byProbe.get(label) ?? [];
      list.push(point);
      byProbe.set(label, list);
    }

    [...byProbe.entries()].forEach(([, series], index) => {
      drawSeries(series, PROBE_COLORS[index % PROBE_COLORS.length]!);
    });

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      new Date(minTs).toLocaleDateString(),
      pad.left,
      height - 8,
    );
    ctx.textAlign = "right";
    ctx.fillText(
      new Date(maxTs).toLocaleDateString(),
      width - pad.right,
      height - 8,
    );
  }, [points, priorYearPoints]);

  if (points.length < 2) {
    return (
      <div class="history-chart-wrap">
        <p class="history-chart-title m-0">{title}</p>
        <p class="m-0 text-sm text-[var(--color-text-muted)]">
          Not enough readings yet for a chart. Snapshots collect automatically while devices are online.
        </p>
      </div>
    );
  }

  return (
    <div class="history-chart-wrap">
      <p class="history-chart-title">{title}</p>
      {probeLabels.length > 1 && (
        <p class="m-0 mb-2 text-xs text-[var(--color-text-muted)]">
          {probeLabels.map((label, i) => (
            <span key={label}>
              {i > 0 ? " · " : ""}
              <span style={{ color: PROBE_COLORS[i % PROBE_COLORS.length] }}>
                {label}
              </span>
            </span>
          ))}
        </p>
      )}
      {priorYearPoints.length >= 2 && (
        <p class="m-0 mb-2 text-xs text-[var(--color-text-muted)]">
          Gray = same window last year
        </p>
      )}
      <canvas
        ref={canvasRef}
        class="w-full"
        style={{ height: "220px" }}
        role="img"
        aria-label={`Line chart of ${title}`}
      />
    </div>
  );
}
