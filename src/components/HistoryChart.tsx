import { useEffect, useRef } from "preact/hooks";

type Point = {
  timestamp: string;
  tempf: number;
  humidity: number;
  probeLabel: string;
};

interface Props {
  points: Point[];
  title?: string;
}

export default function HistoryChart({
  points,
  title = "Temperature trend (last 7 days)",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { top: 16, right: 16, bottom: 28, left: 44 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const temps = points.map((p) => p.tempf);
    const min = Math.min(...temps) - 2;
    const max = Math.max(...temps) + 2;
    const range = max - min || 1;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#151b24";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (innerH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      const val = max - (range / 4) * i;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${val.toFixed(0)}°F`, pad.left - 6, y + 3);
    }

    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, i) => {
      const x = pad.left + (i / (points.length - 1)) * innerW;
      const y = pad.top + innerH - ((point.tempf - min) / range) * innerH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const last = points[points.length - 1];
    const lastX = pad.left + innerW;
    const lastY = pad.top + innerH - ((last.tempf - min) / range) * innerH;
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      new Date(points[0].timestamp).toLocaleDateString(),
      pad.left,
      height - 8,
    );
    ctx.textAlign = "right";
    ctx.fillText(
      new Date(last.timestamp).toLocaleDateString(),
      width - pad.right,
      height - 8,
    );
  }, [points]);

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
