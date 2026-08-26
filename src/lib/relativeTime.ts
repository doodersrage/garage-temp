/** Relative time helpers for sensor / device freshness UI. */

export const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

export function formatRelativeAge(
  iso: string | null | undefined,
  neverLabel = "never",
): { label: string; stale: boolean; absolute: string | null } {
  if (!iso) {
    return { label: neverLabel, stale: true, absolute: null };
  }

  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return { label: neverLabel, stale: true, absolute: null };
  }

  const ms = Date.now() - parsed;
  const absolute = new Date(parsed).toLocaleString();

  if (ms < 0) {
    return { label: "just now", stale: false, absolute };
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
    stale: ms >= STALE_MS,
    absolute,
  };
}
