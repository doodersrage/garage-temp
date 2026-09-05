/**
 * Associated hardware accessories (companion devices and kit pieces).
 * Not temperature probes — see freeze-kit / ingest sketches for those.
 */

export type AccessoryId =
  | "claim-puck"
  | "alert-beacon"
  | "door-puck"
  | "leak-puck"
  | "power-nudge"
  | "kit-labels"
  | "probe-mount-kit"
  | "claim-puck-case";

export type AccessoryKind = "companion" | "sensor-contact" | "kit";

export interface AccessoryDef {
  id: AccessoryId;
  path: string;
  name: string;
  shortName: string;
  tagline: string;
  kind: AccessoryKind;
  /** Marketing FAQ key in marketingFaqs.ts */
  faqKey: string;
}

export const ACCESSORIES: AccessoryDef[] = [
  {
    id: "claim-puck",
    path: "/claim-puck",
    name: "Claim puck",
    shortName: "Claim puck",
    tagline:
      "USB presence key: claim a bay with a button press, then show freeze and flood moods on an RP2040-Zero LED.",
    kind: "companion",
    faqKey: "claimPuck",
  },
  {
    id: "alert-beacon",
    path: "/alert-beacon",
    name: "Alert beacon",
    shortName: "Alert beacon",
    tagline:
      "Desk or hallway mood light that mirrors Bay Buddy freeze/flood moods. Not a temperature probe.",
    kind: "companion",
    faqKey: "alertBeacon",
  },
  {
    id: "door-puck",
    path: "/door-puck",
    name: "Door contact puck",
    shortName: "Door puck",
    tagline:
      "Magnetic reed or button contact that POSTs door open/closed to ingest for drafty-bay moods and custom alerts.",
    kind: "sensor-contact",
    faqKey: "doorPuck",
  },
  {
    id: "leak-puck",
    path: "/leak-puck",
    name: "Leak contact puck",
    shortName: "Leak puck",
    tagline:
      "Water-contact pads that POST wet/dry flood sensors. ThermalTrace auto-alerts when wet once alerts are on.",
    kind: "sensor-contact",
    faqKey: "leakPuck",
  },
  {
    id: "power-nudge",
    path: "/power-nudge",
    name: "Power outage nudge",
    shortName: "Power nudge",
    tagline:
      "USB-mains or UPS sense contact that POSTs power lost/restored so you know when the bay went dark.",
    kind: "sensor-contact",
    faqKey: "powerNudge",
  },
  {
    id: "kit-labels",
    path: "/kit-labels",
    name: "Kit QR & NFC labels",
    shortName: "Kit labels",
    tagline:
      "Printable QR stickers and optional NFC tags encoding your push ingest URL for onboarding without typing keys.",
    kind: "kit",
    faqKey: "kitLabels",
  },
  {
    id: "probe-mount-kit",
    path: "/probe-mount-kit",
    name: "Probe mount kit",
    shortName: "Mount kit",
    tagline:
      "Zip-ties, pipe clips, adhesive pads, 4.7k pull-up, and waterproof DS18B20 mounting notes for a reliable freeze probe.",
    kind: "kit",
    faqKey: "probeMountKit",
  },
  {
    id: "claim-puck-case",
    path: "/claim-puck-case",
    name: "Claim puck case",
    shortName: "Puck case",
    tagline:
      "Enclosure, button, and optional LED diffuser for the RP2040-Zero claim puck — productize the bare board build.",
    kind: "kit",
    faqKey: "claimPuckCase",
  },
];

export function getAccessory(id: AccessoryId): AccessoryDef {
  const found = ACCESSORIES.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown accessory: ${id}`);
  return found;
}

export function accessoriesExcluding(id: AccessoryId): AccessoryDef[] {
  return ACCESSORIES.filter((a) => a.id !== id);
}
