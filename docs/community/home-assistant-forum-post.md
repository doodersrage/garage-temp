# Home Assistant community post (draft)

Copy/paste into a new topic on [community.home-assistant.io](https://community.home-assistant.io/) in **Share your Projects** or **Third party integrations**.

---

**Title:** ThermalTrace — garage/crawlspace freeze monitoring with official HACS integration

**Tags:** `custom-component` `integration` `sensor` `freeze` `garage`

---

Hi all — we run [ThermalTrace](https://thermaltrace.dev), a hosted dashboard for ESP/Arduino garage and workshop probes with freeze alerts, history, and household sharing. We shipped an **official HACS custom integration** and wanted to share it here.

### What it does

- Polls a **Pro share link** (`GET /api/share/{token}/readings`) and creates temperature, humidity, door, leak, and other entities automatically
- Optional **inbound webhook** services: `thermaltrace.snooze`, `thermaltrace.vacation`, `thermaltrace.clear_snooze`, `thermaltrace.clear_vacation`, `thermaltrace.status`
- Optional **push** service to POST readings from HA automations
- Designed to **dual-run with MQTT** — keep Mosquitto on your LAN; use ThermalTrace for off-site SMS/history

### Install

1. HACS → Integrations → Custom repositories → add  
   `https://github.com/doodersrage/thermaltrace-home-assistant`
2. Install **ThermalTrace**, restart HA
3. Create a **readings** share link at [thermaltrace.dev](https://thermaltrace.dev) (free account to start; share links on Pro)
4. Settings → Devices & services → Add integration → ThermalTrace → paste token

Full guide: https://thermaltrace.dev/integrations/home-assistant

### Beyond HACS (optional)

- **MQTT → HTTP bridge** — mirror Mosquitto to ThermalTrace without exposing your broker: [MQTT bridge docs](https://doodersrage.github.io/thermaltrace/integrations/mqtt-bridge) · import [Node-RED flow](https://thermaltrace.dev/nodered/mqtt-to-thermaltrace.json) (temp + garage door tabs)
- **ESPHome / Shelly** — push ingest recipes if you do not want HA in the middle: https://thermaltrace.dev/about/esphome-shelly-recipes
- **Garage door + cold alerts** — combined rule when a bay door is open while temps drop: https://thermaltrace.dev/about/garage-door-cold-playbook

### Example automation

Snooze freeze alerts while the garage door is open for maintenance:

```yaml
automation:
  - alias: Snooze ThermalTrace while garage door open
    trigger:
      - platform: state
        entity_id: binary_sensor.garage_door
        to: "on"
    action:
      - service: thermaltrace.snooze
        data:
          hours: 4
```

### Links

- HACS repo: https://github.com/doodersrage/thermaltrace-home-assistant
- Product + docs: https://thermaltrace.dev/integrations/home-assistant
- Integrations hub: https://thermaltrace.dev/integrations
- OpenAPI: https://thermaltrace.dev/openapi.yaml

Happy to answer setup questions in this thread. If you try it, we'd love feedback on entity naming and poll interval defaults.

---

*Note for maintainers:* default HACS store submission is in progress ([#10550](https://github.com/hacs/default/pull/10550)); until merged, use the custom repository URL above.
