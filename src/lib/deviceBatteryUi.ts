import type { DeviceWithSensors } from "./devices";
import { readDeviceMetaNumber } from "./deviceHealth";

export type LowBatteryDevice = {
  id: string;
  name: string;
  batteryPct: number;
};

export function listLowBatteryDevices(
  devices: DeviceWithSensors[],
  thresholdPct: number,
): LowBatteryDevice[] {
  return devices
    .filter((d) => d.enabled && d.source === "push")
    .map((device) => {
      const batteryPct = readDeviceMetaNumber(device.meta, "battery_pct");
      if (batteryPct == null || batteryPct > thresholdPct) return null;
      return { id: device.id, name: device.name, batteryPct };
    })
    .filter((row): row is LowBatteryDevice => row != null)
    .sort((a, b) => a.batteryPct - b.batteryPct);
}

export function lowBatteryBannerMessage(devices: LowBatteryDevice[]): string {
  if (devices.length === 0) return "";
  if (devices.length === 1) {
    return `${devices[0]!.name} battery is ${devices[0]!.batteryPct}% — charge or replace before it stops posting.`;
  }
  const names = devices
    .slice(0, 3)
    .map((d) => `${d.name} (${d.batteryPct}%)`)
    .join(", ");
  const extra = devices.length > 3 ? ` and ${devices.length - 3} more` : "";
  return `Low battery on ${devices.length} devices: ${names}${extra}.`;
}
