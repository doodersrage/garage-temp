# Home Assistant integration

ThermalTrace works with Home Assistant without a custom HACS component today. Use **HTTPS push ingest** (recommended), the **MQTT-over-HTTP bridge**, or **inbound webhooks** for automations.

## REST sensor (pull your share link or metrics)

If you publish a [share link](https://thermaltrace.dev/dashboard/share) (Pro), expose readings as a REST sensor:

```yaml
sensor:
  - platform: rest
    resource: https://thermaltrace.dev/api/share/YOUR_TOKEN/latest
    name: Garage temperature
    value_template: "{{ value_json.readings[0].value_num | float(0) }}"
    unit_of_measurement: "°F"
    scan_interval: 300
```

Adjust the template for your probe keys. Share links are read-only and safe to poll from HA.

## Push from ESPHome or HA → ThermalTrace

Point ESPHome `api`/`http_request` or an HA `rest` **service call** at your device ingest URL:

```yaml
rest:
  - resource: https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY
    method: POST
    headers:
      Content-Type: application/json
    payload: '{"temp1": {{ states("sensor.garage_temp") | float }}, "humidity1": {{ states("sensor.garage_humidity") | float }}}'
```

Create the push device and copy the ingest key from **Dashboard → Devices**.

## MQTT bridge (keep Mosquitto local)

If probes already publish to Mosquitto, mirror selected topics over HTTPS:

```bash
curl -X POST https://thermaltrace.dev/api/ingest/mqtt \
  -H "Authorization: Bearer YOUR_DEVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"garage/temp","payload":"42.5"}'
```

See [MQTT bridge recipe](https://thermaltrace.dev/about/adding-devices#mqtt-bridge) and the downloadable [Node-RED flow](https://thermaltrace.dev/nodered/mqtt-to-thermaltrace.json).

## Inbound webhooks (snooze, vacation, status)

Pro plans can call signed inbound webhooks from HA automations:

```yaml
automation:
  - alias: Snooze ThermalTrace freeze alerts during door work
    trigger:
      - platform: state
        entity_id: cover.garage_door
        to: "open"
    action:
      - service: rest_command.thermaltrace_snooze
```

Register the webhook URL and secret under **Dashboard → Alerts**. Full action list: `POST /api/webhooks/inbound` in [openapi.yaml](https://thermaltrace.dev/openapi.yaml).

## Polling schedule

Pull feeds on ThermalTrace are polled every **15 minutes** (`:00`, `:15`, `:30`, `:45` UTC). Push ingest updates live readings immediately. For near-real-time HA dashboards, push from HA or ESPHome rather than relying on pull.

## More

- [Adding devices](https://thermaltrace.dev/about/adding-devices)
- [HTTP API overview](https://thermaltrace.dev/docs/api)
- [vs DIY MQTT stack](https://thermaltrace.dev/compare/diy-mqtt)
