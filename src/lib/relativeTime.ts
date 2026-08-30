/** Relative time helpers for sensor / device freshness UI. */

/** Soft warning for live cards — probe likely missed a few posts. */
export const LAG_MS = 30 * 60 * 1000; // 30 minutes

/** Hard stale — treat as offline for status / share pages. */
export const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

export type RelativeAge = {
  label: string;
  /** True when older than {@link LAG_MS} (30m). */
  lagging: boolean;
  /** True when older than {@link STALE_MS} (2h). */
  stale: boolean;
  absolute: string | null;
};

export function formatRelativeAge(
  iso: string | null | undefined,
  neverLabel = "never",
): RelativeAge {
  if (!iso) {
    return { label: neverLabel, lagging: true, stale: true, absolute: null };
  }

  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return { label: neverLabel, lagging: true, stale: true, absolute: null };
  }

  const ms = Date.now() - parsed;
  const absolute = new Date(parsed).toLocaleString();

  if (ms < 0) {
    return { label: "just now", lagging: false, stale: false, absolute };
  }

  const minutes = Math.floor(ms / 60000);
  let label: string;
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes}m ago`;
  else {
    const hours = Math.floor(minutes / 60);
    label =
      hours < 48
        ? `${hours}h ago`
        : `${Math.floor(hours / 24)}d ago`;
  }

  return {
    label,
    lagging: ms >= LAG_MS,
    stale: ms >= STALE_MS,
    absolute,
  };
}

/** Live UI copy: offline after lag, stronger after hard stale. */
export function freshnessDetail(age: RelativeAge): string {
  if (age.stale) return `Offline · last seen ${age.label}`;
  if (age.lagging) return `May be offline · last seen ${age.label}`;
  return `Updated ${age.label}`;
}
