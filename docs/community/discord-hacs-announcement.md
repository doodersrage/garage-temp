# Discord / social announcement (draft)

Post in your ThermalTrace Discord `#announcements` (or similar) when ready. Shorten for Bluesky/Mastodon.

---

**ThermalTrace × Home Assistant**

We shipped an official Home Assistant integration — install via HACS custom repository:

`https://github.com/doodersrage/thermaltrace-home-assistant`

**What you get**
- Share-link sensors (temp, humidity, doors, leaks, …) from a Free family live token (Pro expands scopes)
- Services: `thermaltrace.snooze`, `thermaltrace.vacation`, optional push ingest
- Dual-run with MQTT on your LAN; ThermalTrace handles off-site SMS + history

**Also new**
- Node-RED MQTT bridge flow (temp + door): https://thermaltrace.dev/nodered/mqtt-to-thermaltrace.json
- ESPHome/Shelly push ingest recipes: https://thermaltrace.dev/about/esphome-shelly-recipes
- Ambient Weather & WeatherFlow for yard-level outdoor context in Settings

**Setup guide:** https://thermaltrace.dev/integrations/home-assistant

Default HACS store listing is in review ([#10550](https://github.com/hacs/default/pull/10550)) — custom repo works today.

Questions → this channel or GitHub issues on the integration repo.

---

**One-liner (Bluesky):**

Official ThermalTrace HACS integration — share-link sensors, snooze services, MQTT/ESPHome recipes for freeze and leak monitoring in garages, workshops & crawlspaces. https://thermaltrace.dev/integrations/home-assistant
