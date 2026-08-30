/** Shared cold-snap checklist used by freeze-season + dashboard widget. */

export const COLD_SNAP_CHECKLIST: string[] = [
  "Drip faucets on exterior walls if supply lines run through cold spaces.",
  "Check garage door seals and close any propped-open doors.",
  "Insulate outdoor spigots and disconnect garden hoses.",
  "Confirm freeze alerts are on — send a test if you have not lately.",
  "Verify a probe sits in the coldest corner near pipes or stored goods.",
];

export function shouldShowColdSnapChecklist(input: {
  nightsRiskCount: number;
  outdoorTempF: number | null;
  hasNwsFreezeAlerts: boolean;
}): boolean {
  if (input.nightsRiskCount > 0) return true;
  if (input.hasNwsFreezeAlerts) return true;
  if (input.outdoorTempF != null && Number.isFinite(input.outdoorTempF)) {
    return input.outdoorTempF <= 35;
  }
  return false;
}
