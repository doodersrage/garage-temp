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

/** Live tile °F — hundredths avoid float junk overflow in compact cards. */
export function formatLiveTempF(tempF: number, decimals = 2): string {
  if (!Number.isFinite(tempF)) return "—";
  return `${tempF.toFixed(decimals)}°F`;
}

export function formatLiveTempDetail(
  tempC: number,
  humidity: number,
  decimals = 2,
): string {
  const c = Number.isFinite(tempC) ? tempC.toFixed(decimals) : "—";
  const h = Number.isFinite(humidity) ? humidity.toFixed(decimals) : "—";
  return `${c}°C · ${h}% humidity`;
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
