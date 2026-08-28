import type { AlertChannelName } from "./alerts";

export type AlertPlaybookStep = {
  id: string;
  name: string;
  /** Minutes after initial alert before this step runs. */
  afterMinutes: number;
  /** Only run if no alert was acknowledged since the triggering event. */
  ifUnacked: boolean;
  channels: AlertChannelName[];
  /** Optional kind filter; empty = all kinds. */
  kinds: string[];
};

export function parseAlertPlaybooks(raw: unknown): AlertPlaybookStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is AlertPlaybookStep => {
    if (!item || typeof item !== "object") return false;
    const step = item as Record<string, unknown>;
    return (
      typeof step.id === "string" &&
      typeof step.afterMinutes === "number" &&
      Array.isArray(step.channels)
    );
  }) as AlertPlaybookStep[];
}

export function parseAlertPlaybooksFromForm(raw: string | null | undefined): AlertPlaybookStep[] {
  if (!raw?.trim()) return [];
  try {
    return parseAlertPlaybooks(JSON.parse(raw));
  } catch {
    return [];
  }
}
