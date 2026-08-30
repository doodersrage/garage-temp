export type AlertConditionType =
  | "temp_below"
  | "humidity_above"
  | "door_open"
  | "door_open_duration"
  | "rate_drop"
  | "outage"
  | "flood"
  | "power_off"
  | "co2_above"
  | "pressure_below"
  | "pm25_above"
  | "voc_above"
  | "level_above"
  | "energy_below"
  | "motion_detected";

export type AlertCondition = {
  type: AlertConditionType;
  /** Optional threshold override (°F, %, hours, ppm depending on type). */
  value?: number;
  /** Optional sensor/device label match (substring, case-insensitive). */
  labelIncludes?: string;
};

export type AlertRule = {
  id: string;
  enabled: boolean;
  name: string;
  all: AlertCondition[];
};

export type RuleEvalContext = {
  readings: Array<{ label: string; tempf: number; humidity: number }>;
  boolSensors: Array<{ label: string; kind: string; value: boolean }>;
  numericSensors: Array<{ label: string; kind: string; value: number }>;
  doorOpenSessions: Array<{
    label: string;
    durationMs: number | null;
    stillOpen: boolean;
  }>;
  rateDrops: Array<{ label: string; dropF: number }>;
  outages: Array<{ deviceName: string; hoursSilent: number }>;
  freezeThresholdF: number;
  humidityThreshold: number;
  rateChangeF: number;
  outageHours: number;
};

function matchesLabel(label: string, includes?: string): boolean {
  if (!includes) return true;
  return label.toLowerCase().includes(includes.toLowerCase());
}

function evaluateCondition(
  condition: AlertCondition,
  ctx: RuleEvalContext,
): boolean {
  switch (condition.type) {
    case "temp_below": {
      const threshold = condition.value ?? ctx.freezeThresholdF;
      return ctx.readings.some(
        (r) => matchesLabel(r.label, condition.labelIncludes) && r.tempf <= threshold,
      );
    }
    case "humidity_above": {
      const threshold = condition.value ?? ctx.humidityThreshold;
      return ctx.readings.some(
        (r) =>
          matchesLabel(r.label, condition.labelIncludes) && r.humidity >= threshold,
      );
    }
    case "door_open":
      return ctx.boolSensors.some(
        (s) =>
          s.kind === "door" &&
          s.value === true &&
          matchesLabel(s.label, condition.labelIncludes),
      );
    case "door_open_duration": {
      const minMinutes = condition.value ?? 30;
      const minMs = minMinutes * 60 * 1000;
      return ctx.doorOpenSessions.some((session) => {
        if (!matchesLabel(session.label, condition.labelIncludes)) return false;
        if (session.stillOpen) return true;
        return (session.durationMs ?? 0) >= minMs;
      });
    }
    case "flood":
      return ctx.boolSensors.some(
        (s) =>
          s.kind === "flood" &&
          s.value === true &&
          matchesLabel(s.label, condition.labelIncludes),
      );
    case "power_off":
      return ctx.boolSensors.some(
        (s) =>
          s.kind === "power" &&
          s.value === false &&
          matchesLabel(s.label, condition.labelIncludes),
      );
    case "co2_above": {
      const threshold = condition.value ?? 1000;
      return ctx.numericSensors.some(
        (s) =>
          s.kind === "co2" &&
          matchesLabel(s.label, condition.labelIncludes) &&
          s.value >= threshold,
      );
    }
    case "pressure_below": {
      const threshold = condition.value ?? 980;
      return ctx.numericSensors.some(
        (s) =>
          s.kind === "pressure" &&
          matchesLabel(s.label, condition.labelIncludes) &&
          s.value <= threshold,
      );
    }
    case "pm25_above": {
      const threshold = condition.value ?? 35;
      return ctx.numericSensors.some(
        (s) =>
          s.kind === "pm25" &&
          matchesLabel(s.label, condition.labelIncludes) &&
          s.value >= threshold,
      );
    }
    case "voc_above": {
      const threshold = condition.value ?? 400;
      return ctx.numericSensors.some(
        (s) =>
          s.kind === "voc" &&
          matchesLabel(s.label, condition.labelIncludes) &&
          s.value >= threshold,
      );
    }
    case "level_above": {
      const threshold = condition.value ?? 80;
      return ctx.numericSensors.some(
        (s) =>
          s.kind === "level" &&
          matchesLabel(s.label, condition.labelIncludes) &&
          s.value >= threshold,
      );
    }
    case "energy_below": {
      const threshold = condition.value ?? 10;
      return ctx.numericSensors.some(
        (s) =>
          s.kind === "energy" &&
          matchesLabel(s.label, condition.labelIncludes) &&
          s.value <= threshold,
      );
    }
    case "motion_detected":
      return ctx.boolSensors.some(
        (s) =>
          s.kind === "motion" &&
          s.value === true &&
          matchesLabel(s.label, condition.labelIncludes),
      );
    case "rate_drop": {
      const threshold = condition.value ?? ctx.rateChangeF;
      return ctx.rateDrops.some(
        (r) =>
          matchesLabel(r.label, condition.labelIncludes) && r.dropF >= threshold,
      );
    }
    case "outage": {
      const threshold = condition.value ?? ctx.outageHours;
      return ctx.outages.some(
        (o) =>
          matchesLabel(o.deviceName, condition.labelIncludes) &&
          o.hoursSilent >= threshold,
      );
    }
    default:
      return false;
  }
}

export function evaluateAlertRules(
  rules: AlertRule[],
  ctx: RuleEvalContext,
): string[] {
  const messages: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled || !rule.all?.length) continue;
    const allMatch = rule.all.every((c) => evaluateCondition(c, ctx));
    if (allMatch) {
      const parts = rule.all.map((c) => c.type.replace(/_/g, " ")).join(" AND ");
      messages.push(`Rule "${rule.name}" matched (${parts}).`);
    }
  }

  return messages;
}

export function parseAlertRulesFromForm(raw: string | null | undefined): AlertRule[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is AlertRule => {
        if (!item || typeof item !== "object") return false;
        const rule = item as Partial<AlertRule>;
        return (
          typeof rule.id === "string" &&
          typeof rule.name === "string" &&
          Array.isArray(rule.all)
        );
      })
      .map((rule) => ({
        id: rule.id,
        enabled: rule.enabled !== false,
        name: rule.name.slice(0, 80),
        all: rule.all.slice(0, 8).map((c) => ({
          type: c.type,
          value: typeof c.value === "number" ? c.value : undefined,
          labelIncludes:
            typeof c.labelIncludes === "string" ? c.labelIncludes : undefined,
        })),
      }));
  } catch {
    return [];
  }
}

export const CONDITION_OPTIONS: Array<{ value: AlertConditionType; label: string }> = [
  { value: "temp_below", label: "Temperature below threshold" },
  { value: "humidity_above", label: "Humidity above threshold" },
  { value: "door_open", label: "Door open" },
  { value: "door_open_duration", label: "Door open longer than (minutes)" },
  { value: "rate_drop", label: "Rapid temperature drop" },
  { value: "outage", label: "Device outage" },
  { value: "flood", label: "Flood detected" },
  { value: "power_off", label: "Power off" },
  { value: "co2_above", label: "CO₂ above (ppm)" },
  { value: "pressure_below", label: "Pressure below (hPa)" },
  { value: "pm25_above", label: "PM2.5 above (µg/m³)" },
  { value: "voc_above", label: "VOC above (ppb)" },
  { value: "level_above", label: "Water / sump level above (%)" },
  { value: "energy_below", label: "Energy below (W)" },
  { value: "motion_detected", label: "Motion detected" },
];
