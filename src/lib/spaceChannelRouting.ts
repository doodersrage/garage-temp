import type { AlertChannelName, AlertSettings, NotifyKind } from "./alerts";

export type SpaceChannelRouting = Partial<
  Record<string, Partial<Record<NotifyKind, AlertChannelName[]>>>
>;

export function parseSpaceChannelRouting(raw: unknown): SpaceChannelRouting {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SpaceChannelRouting = {};
  for (const [space, kinds] of Object.entries(raw as Record<string, unknown>)) {
    if (!kinds || typeof kinds !== "object" || Array.isArray(kinds)) continue;
    const spaceKey = space.trim().toLowerCase();
    if (!spaceKey) continue;
    const kindMap: Partial<Record<NotifyKind, AlertChannelName[]>> = {};
    for (const [kind, channels] of Object.entries(kinds as Record<string, unknown>)) {
      if (!Array.isArray(channels)) continue;
      kindMap[kind as NotifyKind] = channels.filter(
        (c): c is AlertChannelName => typeof c === "string",
      );
    }
    if (Object.keys(kindMap).length > 0) out[spaceKey] = kindMap;
  }
  return out;
}

/** Restrict channels when a space-specific routing rule exists for this alert kind. */
export function filterChannelsForSpace(
  settings: AlertSettings,
  space: string | null | undefined,
  kind: NotifyKind,
  channels: AlertChannelName[],
): AlertChannelName[] {
  const normalized = space?.trim().toLowerCase();
  if (!normalized) return channels;

  const routing = settings.spaceChannelRouting?.[normalized]?.[kind];
  if (!routing || routing.length === 0) return channels;

  const allowed = new Set(routing);
  return channels.filter((ch) => allowed.has(ch));
}
