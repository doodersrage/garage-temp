/** Bay Buddy mood vocabulary shared with claim-puck firmware. */

export const BAY_MOODS = [
  "cozy",
  "drafty",
  "shiver",
  "panic",
  "offline",
  "hero",
] as const;

export type BayMood = (typeof BAY_MOODS)[number];

const MOOD_PRIORITY: BayMood[] = [
  "panic",
  "offline",
  "shiver",
  "drafty",
  "hero",
  "cozy",
];

export function isBayMood(value: string): value is BayMood {
  return (BAY_MOODS as readonly string[]).includes(value);
}

/** Same priority rules as Bay Buddy / claim-puck host expectations. */
export function resolveBayMood(input: {
  wetContact: boolean;
  feedHealthy: boolean;
  freezeMarginF: number | null;
  doorOpen: boolean;
  recentlyRecovered?: boolean;
}): BayMood {
  const candidates: BayMood[] = [];
  if (input.wetContact) candidates.push("panic");
  if (!input.feedHealthy) candidates.push("offline");
  if (input.freezeMarginF !== null && input.freezeMarginF <= 5) {
    candidates.push("shiver");
  }
  if (input.doorOpen) candidates.push("drafty");
  if (input.recentlyRecovered) candidates.push("hero");
  candidates.push("cozy");
  return MOOD_PRIORITY.find((m) => candidates.includes(m)) ?? "cozy";
}

export function isValidBayId(value: string): boolean {
  return /^[A-Za-z0-9_.:-]{1,32}$/.test(value);
}
