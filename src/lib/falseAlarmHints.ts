/**
 * Copy helpers for noisy alerts — placement, unplugged probes, and smarter snooze.
 */

export type FalseAlarmHint = {
  id: string;
  title: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
};

/** Tips shown on Alerts when users are fighting repeat freeze noise. */
export const FALSE_ALARM_TIPS: FalseAlarmHint[] = [
  {
    id: "placement",
    title: "Check probe placement",
    detail:
      "Probes on door tracks, near exhaust fans, or in sun-loaded walls swing hard and trip freeze alerts that the pipes never see. Move toward the coldest pipe run or slab corner.",
    href: "/about/probe-demo",
    hrefLabel: "Probe simulator",
  },
  {
    id: "unplugged",
    title: "Stale often means unplugged",
    detail:
      "If a probe goes quiet for hours, treat it as power/Wi‑Fi first — not a freeze. Enable outage alerts and confirm the ESP still POSTs from Devices.",
    href: "/about/debugging-stale-readings",
    hrefLabel: "Stale readings guide",
  },
  {
    id: "threshold",
    title: "Raise the threshold a degree or two",
    detail:
      "A 32°F trip fires on every brief draft. Many households use 34–36°F so they act before ice forms without waking for every door open.",
    href: "/dashboard/alerts#alert-section-essentials",
    hrefLabel: "Alert essentials",
  },
  {
    id: "snooze",
    title: "Snooze while you fix it",
    detail:
      "Working in a cold bay? Snooze 4–24 hours so threshold noise stops while you weatherstrip, drip faucets, or reseat the probe — forecast and flood alerts still get through on vacation mode.",
  },
];

export function staleProbeDetail(staleCount: number): string {
  const n = Math.max(1, staleCount);
  const probe = n === 1 ? "probe looks" : "probes look";
  return `${n} ${probe} stale — likely unplugged, offline Wi‑Fi, or a dead battery. Check power and Devices before treating it as a freeze.`;
}

export function likelyFalseAlarmFromStale(staleSensorCount: number): boolean {
  return staleSensorCount > 0;
}
