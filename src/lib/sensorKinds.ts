export const SENSOR_KINDS = [
  "temperature",
  "humidity",
  "co2",
  "pressure",
  "pm25",
  "voc",
  "level",
  "energy",
  "door",
  "power",
  "flood",
  "motion",
  "generic",
] as const;

export type SensorKind = (typeof SENSOR_KINDS)[number];

export const SENSOR_KIND_LABELS: Record<SensorKind, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  co2: "CO₂",
  pressure: "Barometric pressure",
  pm25: "PM2.5",
  voc: "VOC",
  level: "Water / sump level",
  energy: "Energy",
  door: "Door",
  power: "Power",
  flood: "Flood / leak",
  motion: "Motion",
  generic: "Generic",
};

export const SENSOR_KIND_UNITS: Partial<Record<SensorKind, string>> = {
  temperature: "°F",
  humidity: "%",
  co2: "ppm",
  pressure: "hPa",
  pm25: "µg/m³",
  voc: "ppb",
  level: "%",
  energy: "W",
};

export const BOOL_SENSOR_KINDS = ["door", "power", "flood", "motion"] as const satisfies readonly SensorKind[];

export const NUMERIC_SENSOR_KINDS = [
  "temperature",
  "humidity",
  "co2",
  "pressure",
  "pm25",
  "voc",
  "level",
  "energy",
  "generic",
] as const satisfies readonly SensorKind[];

export function isSensorKind(value: string): value is SensorKind {
  return (SENSOR_KINDS as readonly string[]).includes(value);
}

export function isBoolSensorKind(kind: string): boolean {
  return (BOOL_SENSOR_KINDS as readonly string[]).includes(kind);
}

export function isNumericSensorKind(kind: string): boolean {
  return (NUMERIC_SENSOR_KINDS as readonly string[]).includes(kind);
}

export function formatBoolSensorValue(kind: string, value: boolean): string {
  if (kind === "door") return value ? "Open" : "Closed";
  if (kind === "power") return value ? "On" : "Off";
  if (kind === "flood") return value ? "Wet" : "Dry";
  if (kind === "motion") return value ? "Detected" : "Clear";
  return value ? "On" : "Off";
}

export function defaultUnitForKind(kind: SensorKind): string | null {
  return SENSOR_KIND_UNITS[kind] ?? null;
}
