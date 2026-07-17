import { useEffect, useRef } from "preact/hooks";
import {
  applyProbeNoise,
  computeDemoProbes,
  type DemoControls,
  type DemoProbe,
} from "../lib/probeDemo";

const COLORS = {
  cream: "#fcde9c",
  peach: "#ffa552",
  terracotta: "#ba5624",
  plum: "#381d2a",
  sage: "#c4d6b0",
  surface: "#fffaf0",
  muted: "#6b4a55",
};

type ProbeNode = {
  x: number;
  y: number;
  label: string;
  key: string;
};

const PROBE_NODES: ProbeNode[] = [
  { x: 0.28, y: 0.58, label: "North wall", key: "0" },
  { x: 0.48, y: 0.68, label: "Door zone", key: "1" },
  { x: 0.72, y: 0.52, label: "Workbench", key: "2" },
];

function tempColor(tempF: number): string {
  const t = Math.min(1, Math.max(0, (tempF - 34) / 28));
  const r = Math.round(196 + t * (186 - 196));
  const g = Math.round(214 - t * (214 - 86));
  const b = Math.round(176 - t * (176 - 36));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function AboutProbeActivity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let lastTick = 0;
    let start = performance.now();

    let controls: DemoControls = {
      outdoorF: 42,
      sunIntensity: 35,
      doorOpen: false,
    };
    let doorProgress = 0;
    let probes: DemoProbe[] = computeDemoProbes(controls);
    const sparkHistory: number[][] = PROBE_NODES.map(() => []);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 320);
      height = Math.max(rect.height, 280);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getSceneControls(elapsed: number): DemoControls {
      if (reducedMotionRef.current) {
        return { outdoorF: 44, sunIntensity: 40, doorOpen: false };
      }

      const cycle = elapsed % 28000;
      const doorOpen = cycle > 11000 && cycle < 17000;
      const doorAnim = doorOpen
        ? Math.min(1, (cycle - 11000) / 1200)
        : cycle >= 17000
          ? Math.max(0, 1 - (cycle - 17000) / 1200)
          : 0;

      doorProgress = doorAnim;

      return {
        outdoorF: 38 + Math.sin(elapsed / 22000) * 6,
        sunIntensity: 22 + (0.5 + 0.5 * Math.sin(elapsed / 9000)) * 48,
        doorOpen: doorAnim > 0.5,
      };
    }

    function tickReadings(now: number) {
      if (now - lastTick < 2000) return;
      lastTick = now;
      const { probes: noisy } = applyProbeNoise(computeDemoProbes(controls));
      probes = noisy;
      probes.forEach((probe, i) => {
        sparkHistory[i].push(probe.reading.f);
        if (sparkHistory[i].length > 24) sparkHistory[i].shift();
      });
    }

    function drawSun(intensity: number) {
      const sunX = width * 0.86;
      const sunY = height * 0.16;
      const radius = 22 + intensity * 0.18;

      const glow = ctx!.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius * 2.2);
      glow.addColorStop(0, `rgba(255, 165, 82, ${0.35 + intensity * 0.004})`);
      glow.addColorStop(1, "rgba(255, 165, 82, 0)");
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(sunX, sunY, radius * 2.2, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.fillStyle = COLORS.peach;
      ctx!.beginPath();
      ctx!.arc(sunX, sunY, radius, 0, Math.PI * 2);
      ctx!.fill();

      if (!reducedMotionRef.current) {
        ctx!.strokeStyle = `rgba(186, 86, 36, ${0.25 + intensity * 0.005})`;
        ctx!.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (elapsedRayAngle(start) + i * Math.PI) / 4;
          ctx!.beginPath();
          ctx!.moveTo(sunX + Math.cos(angle) * (radius + 6), sunY + Math.sin(angle) * (radius + 6));
          ctx!.lineTo(sunX + Math.cos(angle) * (radius + 18), sunY + Math.sin(angle) * (radius + 18));
          ctx!.stroke();
        }
      }

      ctx!.fillStyle = COLORS.plum;
      ctx!.font = "600 11px system-ui, sans-serif";
      ctx!.textAlign = "center";
      ctx!.fillText(`Sun load ${Math.round(intensity)}%`, sunX, sunY + radius + 22);
    }

    function elapsedRayAngle(t0: number) {
      return (performance.now() - t0) / 1200;
    }

    function drawGarage(doorAmount: number, outdoorF: number) {
      const gx = width * 0.1;
      const gy = height * 0.24;
      const gw = width * 0.72;
      const gh = height * 0.44;
      const doorW = gw * 0.34;
      const doorH = gh * 0.72;

      const sky = ctx!.createLinearGradient(0, 0, 0, gy);
      sky.addColorStop(0, "#e8f0e0");
      sky.addColorStop(1, COLORS.cream);
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, width, gy);

      ctx!.fillStyle = COLORS.surface;
      drawRoundedRect(ctx!, gx, gy, gw, gh, 10);
      ctx!.fill();
      ctx!.strokeStyle = COLORS.plum;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      ctx!.fillStyle = COLORS.muted;
      ctx!.font = "600 13px system-ui, sans-serif";
      ctx!.textAlign = "left";
      ctx!.fillText("Garage interior", gx + 14, gy + 22);

      const doorLift = doorAmount * doorH * 0.82;
      const doorX = gx + 16;
      const doorY = gy + gh - doorH - 12 + doorLift;

      ctx!.fillStyle = `rgba(196, 214, 176, ${0.35 + doorAmount * 0.45})`;
      ctx!.fillRect(gx, gy, gw, gh);

      ctx!.fillStyle = lerpColor(doorAmount, "#8a9a78", "#c4d6b0");
      drawRoundedRect(ctx!, doorX, doorY, doorW, doorH - doorLift, 6);
      ctx!.fill();
      ctx!.strokeStyle = COLORS.plum;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      for (let i = 0; i < 4; i++) {
        const ly = doorY + 18 + i * ((doorH - doorLift - 28) / 3);
        ctx!.strokeStyle = "rgba(56, 29, 42, 0.25)";
        ctx!.beginPath();
        ctx!.moveTo(doorX + 10, ly);
        ctx!.lineTo(doorX + doorW - 10, ly);
        ctx!.stroke();
      }

      if (doorAmount > 0.05) {
        ctx!.fillStyle = tempColor(outdoorF);
        ctx!.fillRect(gx, gy, 12, gh);
        ctx!.fillStyle = COLORS.plum;
        ctx!.font = "500 10px system-ui, sans-serif";
        ctx!.save();
        ctx!.translate(gx + 6, gy + gh / 2);
        ctx!.rotate(-Math.PI / 2);
        ctx!.textAlign = "center";
        ctx!.fillText(`${Math.round(outdoorF)}°F outside`, 0, 0);
        ctx!.restore();
      }

      return { gx, gy, gw, gh };
    }

    function lerpColor(t: number, a: string, b: string): string {
      return t > 0.5 ? b : a;
    }

    function drawProbeNode(
      node: ProbeNode,
      probe: DemoProbe | undefined,
      pulse: number,
      garage: { gx: number; gy: number; gw: number; gh: number },
    ) {
      const x = garage.gx + garage.gw * node.x;
      const y = garage.gy + garage.gh * node.y;
      const tempF = probe?.reading.f ?? 45;
      const humidity = probe?.reading.h ?? 50;

      if (!reducedMotionRef.current) {
        const ring = 16 + pulse * 10;
        ctx!.strokeStyle = `rgba(186, 86, 36, ${0.35 - pulse * 0.25})`;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(x, y, ring, 0, Math.PI * 2);
        ctx!.stroke();
      }

      ctx!.fillStyle = tempColor(tempF);
      ctx!.beginPath();
      ctx!.arc(x, y, 9, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = COLORS.plum;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      const cardW = 108;
      const cardH = 52;
      const cardX = x - cardW / 2;
      const cardY = y - 58;

      ctx!.fillStyle = "rgba(255, 250, 240, 0.94)";
      drawRoundedRect(ctx!, cardX, cardY, cardW, cardH, 8);
      ctx!.fill();
      ctx!.strokeStyle = COLORS.sage;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      ctx!.fillStyle = COLORS.plum;
      ctx!.font = "600 10px system-ui, sans-serif";
      ctx!.textAlign = "center";
      ctx!.fillText(node.label, x, cardY + 16);

      ctx!.font = "700 14px system-ui, sans-serif";
      ctx!.fillStyle = COLORS.terracotta;
      ctx!.fillText(`${tempF.toFixed(1)}°F`, x, cardY + 34);

      ctx!.font = "500 10px system-ui, sans-serif";
      ctx!.fillStyle = COLORS.muted;
      ctx!.fillText(`${humidity.toFixed(0)}% RH`, x, cardY + 46);
    }

    function drawSparkline(
      history: number[],
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
    ) {
      ctx!.fillStyle = "rgba(255, 250, 240, 0.92)";
      drawRoundedRect(ctx!, x, y, w, h, 6);
      ctx!.fill();
      ctx!.strokeStyle = COLORS.sage;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      ctx!.fillStyle = COLORS.plum;
      ctx!.font = "600 9px system-ui, sans-serif";
      ctx!.textAlign = "left";
      ctx!.fillText(label, x + 8, y + 14);

      if (history.length < 2) return;

      const min = Math.min(...history) - 1;
      const max = Math.max(...history) + 1;
      const range = max - min || 1;
      const padX = 8;
      const padY = 6;
      const innerW = w - padX * 2;
      const innerH = h - 24;

      ctx!.strokeStyle = COLORS.terracotta;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      history.forEach((val, i) => {
        const px = x + padX + (i / (history.length - 1)) * innerW;
        const py = y + 20 + padY + innerH - ((val - min) / range) * innerH;
        if (i === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      });
      ctx!.stroke();
    }

    function drawDataPulse(elapsed: number) {
      const pulseX = width * 0.1;
      const pulseY = height * 0.93;
      const pulseW = width * 0.8;

      ctx!.fillStyle = COLORS.plum;
      ctx!.font = "600 11px system-ui, sans-serif";
      ctx!.textAlign = "left";
      ctx!.fillText("JSON feed → website dashboard", pulseX, pulseY - 8);

      const dotCount = 5;
      for (let i = 0; i < dotCount; i++) {
        const progress = ((elapsed / 1800 + i / dotCount) % 1);
        const dx = pulseX + progress * pulseW;
        const alpha = progress < 0.85 ? 0.85 : (1 - progress) * 5;
        ctx!.fillStyle = `rgba(186, 86, 36, ${alpha})`;
        ctx!.beginPath();
        ctx!.arc(dx, pulseY + 10, 4, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawFrame(now: number) {
      const elapsed = now - start;
      controls = getSceneControls(elapsed);
      tickReadings(now);

      if (sparkHistory[0].length === 0) {
        probes.forEach((probe, i) => sparkHistory[i].push(probe.reading.f));
      }

      const bg = ctx!.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, COLORS.cream);
      bg.addColorStop(1, "#f5efd8");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, width, height);

      drawSun(controls.sunIntensity);
      const garage = drawGarage(doorProgress, controls.outdoorF);

      const pulse = reducedMotionRef.current
        ? 0
        : 0.5 + 0.5 * Math.sin(elapsed / 600);

      PROBE_NODES.forEach((node, i) => {
        const probe = probes.find((p) => p.key === node.key);
        drawProbeNode(node, probe, pulse, garage);
      });

      const sparkW = (width * 0.72 - 24) / 3;
      const sparkY = height * 0.72;
      const sparkX0 = width * 0.12;
      PROBE_NODES.forEach((node, i) => {
        drawSparkline(
          sparkHistory[i],
          sparkX0 + i * (sparkW + 8),
          sparkY,
          sparkW,
          42,
          node.label,
        );
      });

      drawDataPulse(elapsed);

      ctx!.fillStyle = COLORS.muted;
      ctx!.font = "500 10px system-ui, sans-serif";
      ctx!.textAlign = "right";
      ctx!.fillText(
        reducedMotionRef.current ? "Static preview" : "Simulated probe activity",
        width - 12,
        height - 8,
      );
    }

    function loop(now: number) {
      drawFrame(now);
      if (!reducedMotionRef.current) {
        raf = requestAnimationFrame(loop);
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    probes = computeDemoProbes(controls);
    lastTick = performance.now();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div class="about-probe-activity" aria-hidden="false">
      <canvas
        ref={canvasRef}
        class="about-probe-activity-canvas"
        role="img"
        aria-label="Animated garage cross-section showing three temperature probes reporting live readings, a garage door opening and closing, sun load changing, and data pulses traveling to the website dashboard."
      />
      <p class="about-probe-activity-caption">
        Simulated DHT22 probes in three zones—readings refresh every few seconds, just like the live JSON feed.
      </p>
    </div>
  );
}
