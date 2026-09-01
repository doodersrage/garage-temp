/** Product brand — keep infra IDs (worker, API paths, DB) separate. */
export const BRAND_NAME = "ThermalTrace";
export const BRAND_SHORT = "ThermalTrace";
/** Common-law claim mark for first prominent display (footer / wordmark captions). Not ®. */
export const BRAND_NAME_TM = "ThermalTrace™";
/** Short list of spaces we monitor — use in marketing copy, not internal IDs. */
export const BRAND_SPACES =
  "garages, workshops, attics, crawlspaces, and shops";
export const BRAND_TAGLINE = `Track, log, and analyze sensors in ${BRAND_SPACES}.`;
/** Definition-first for SEO/AEO meta defaults. */
export const BRAND_DESCRIPTION =
  `ThermalTrace is an open-source dashboard for ${BRAND_SPACES}—temperature, humidity, air quality, doors, leaks, power, and energy—with freeze-aware alerts, ESP/Arduino or JSON ingest, and exportable history.`;
