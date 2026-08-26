export function fToC(tempF: number): number {
  return ((tempF - 32) * 5) / 9;
}

export function formatTemperature(
  tempF: number,
  useCelsius: boolean,
  decimals = 0,
): string {
  if (!Number.isFinite(tempF)) return "—";
  if (useCelsius) {
    return `${fToC(tempF).toFixed(decimals)}°C`;
  }
  return `${tempF.toFixed(decimals)}°F`;
}

export function formatDeltaF(deltaF: number, useCelsius: boolean): string {
  if (!Number.isFinite(deltaF)) return "—";
  const sign = deltaF > 0 ? "+" : "";
  if (useCelsius) {
    const deltaC = (deltaF * 5) / 9;
    return `${sign}${deltaC.toFixed(1)}°C`;
  }
  return `${sign}${deltaF.toFixed(1)}°F`;
}
