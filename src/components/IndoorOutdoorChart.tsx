import { useEffect, useRef } from "preact/hooks";
import type { IndoorOutdoorPoint } from "../lib/indoorOutdoorDelta";

interface Props {
  points: IndoorOutdoorPoint[];
  title?: string;
}

export default function IndoorOutdoorChart({
  points,
  title = "Indoor vs outdoor delta",
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

    const deltas = points.map((p) => p.deltaF);
    const min = Math.min(...deltas, 0) - 2;
    const max = Math.max(...deltas, 0) + 2;
    const range = max - min || 1;
    const minTs = Date.parse(points[0]!.timestamp);
    const maxTs = Date.parse(points[points.length - 1]!.timestamp);
    const tsRange = maxTs - minTs || 1;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#151b24";
    ctx.fillRect(0, 0, width, height);

    const zeroY = pad.top + innerH - ((0 - min) / range) * innerH;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(width - pad.right, zeroY);
    ctx.stroke();

    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, i) => {
      const x =
        pad.left +
        ((Date.parse(point.timestamp) - minTs) / tsRange) * innerW;
      const y = pad.top + innerH - ((point.deltaF - min) / range) * innerH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points]);

  if (points.length < 2) return null;

  return (
    <div class="history-chart-wrap">
      <p class="history-chart-title">{title}</p>
      <p class="m-0 mb-2 text-xs text-[var(--color-text-muted)]">
        Blue line = indoor minus current outdoor forecast (flat reference).
      </p>
      <canvas
        ref={canvasRef}
        class="w-full"
        style={{ height: "180px" }}
        role="img"
        aria-label={title}
      />
    </div>
  );
}
