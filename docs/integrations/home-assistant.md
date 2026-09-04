# Home Assistant

ThermalTrace ships an **official [HACS custom integration](https://github.com/doodersrage/thermaltrace-home-assistant)**. Product landing page: [thermaltrace.dev/integrations/home-assistant](https://thermaltrace.dev/integrations/home-assistant).

## HACS (recommended)

1. HACS → Integrations → Custom repositories → add `https://github.com/doodersrage/thermaltrace-home-assistant`
2. Install **ThermalTrace** and restart Home Assistant
3. Create a **family live** share link under Dashboard → Share (Free includes one; Pro adds history/metrics scopes)
4. Add integration → paste share token from `/share/YOUR_TOKEN`

Creates sensors and binary sensors automatically. Optional inbound webhook token + secret enable `thermaltrace.snooze`, `vacation`, `status`, etc. Optional ingest key enables `thermaltrace.push`.

Manual recipes (REST sensor, MQTT bridge) remain in [ingest/home-assistant](/ingest/home-assistant).

## Outbound alerts (ThermalTrace → HA)

ThermalTrace does **not** run MQTT inside Cloudflare Workers. For **alerts into HA**, use the outbound HTTPS webhook (Pro). Alert `kind` may include `runway` when remaining-hours time-to-freeze fires before the probe crosses threshold.

1. Enable **outbound webhook** in Dashboard → Alerts / Share  
2. Point it at HA: `https://<ha-host>/api/webhook/<id>`  
3. Import the blueprint from the repo  

**Blueprint:** [`public/ha/thermaltrace_webhook.yaml`](https://github.com/doodersrage/thermaltrace/blob/main/public/ha/thermaltrace_webhook.yaml)
Also: [thermaltrace.dev/ha/thermaltrace_webhook.yaml](https://thermaltrace.dev/ha/thermaltrace_webhook.yaml)
(Legacy URLs under `/ha/garage_temp_*.yaml` 301 to these paths.)

### What the blueprint does

- Triggers on HA webhook POST  
- Creates a persistent notification with title/body/`kind`  
- Optionally republishes the JSON to an MQTT topic for local automations  

### Signature check

If you set a webhook secret in ThermalTrace, verify `X-Signature` (HMAC-SHA256 hex of the raw body) in a HA template or intermediate proxy before trusting the event.

## Inbound (HA → ThermalTrace)

Pro inbound tokens can snooze alerts, toggle vacation, or report status. The HACS integration wraps `POST /api/inbound/{token}` with signing. See also [HTTP API](/api/) and [ingest/home-assistant](/ingest/home-assistant).

## Indoor temperature (Ecobee / any thermostat)

Ecobee and some other brands do not offer new developer OAuth keys. You can still show **house vs garage** context on ThermalTrace:

1. In Home Assistant, expose your thermostat's current temperature (e.g. `climate.living_room` attribute `current_temperature`).
2. On a schedule (every 15 minutes), POST it to ThermalTrace ingest — HACS `thermaltrace.push` or a REST command — as a normal `temperature` sensor (e.g. key `house_indoor`, label `Hallway`).
3. In ThermalTrace: **Dashboard → Devices → Indoor reference** — pick that sensor.

Overview, heating insights, and history charts overlay the dashed **House** line. Pro users with **Nest OAuth** get the same UX automatically plus HVAC mode on the live card.

Example automation (YAML):

```yaml
automation:
  - alias: Push house temp to ThermalTrace
    trigger:
      - platform: time_pattern
        minutes: "/15"
    action:
      - service: thermaltrace.push
        data:
          sensors:
            - key: house_indoor
              kind: temperature
              value: "{{ state_attr('climate.living_room', 'current_temperature') }}"
              unit: F
```

Product page: [thermaltrace.dev/integrations/home-assistant#indoor-temperature](https://thermaltrace.dev/integrations/home-assistant#indoor-temperature)

## MQTT bridge

Keep Mosquitto on your LAN — mirror readings with [MQTT bridge](/integrations/mqtt-bridge).

## Related

- [HACS repo](https://github.com/doodersrage/thermaltrace-home-assistant)
- [Ingest HA guide](/ingest/home-assistant)
- [Alert webhooks](/integrations/webhooks)
- [vs DIY MQTT](https://thermaltrace.dev/compare/diy-mqtt)
