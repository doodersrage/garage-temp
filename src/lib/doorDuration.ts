export type DoorOpenSession = {
  label: string;
  openedAt: string;
  closedAt: string | null;
  durationMs: number | null;
  stillOpen: boolean;
};

export type BoolReading = {
  label: string;
  kind: string;
  value: boolean;
  recordedAt: string;
};

/** Compute door-open sessions from chronological bool readings (door kind). */
export function computeDoorOpenSessions(readings: BoolReading[]): DoorOpenSession[] {
  const doorReadings = readings
    .filter((r) => r.kind === "door")
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));

  const sessions: DoorOpenSession[] = [];
  let openStart: { label: string; at: string } | null = null;

  for (const row of doorReadings) {
    if (row.value && !openStart) {
      openStart = { label: row.label, at: row.recordedAt };
    } else if (!row.value && openStart && openStart.label === row.label) {
      const durationMs = Date.parse(row.recordedAt) - Date.parse(openStart.at);
      sessions.push({
        label: openStart.label,
        openedAt: openStart.at,
        closedAt: row.recordedAt,
        durationMs,
        stillOpen: false,
      });
      openStart = null;
    }
  }

  if (openStart) {
    sessions.push({
      label: openStart.label,
      openedAt: openStart.at,
      closedAt: null,
      durationMs: null,
      stillOpen: true,
    });
  }

  return sessions;
}

export function formatDurationMs(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}
