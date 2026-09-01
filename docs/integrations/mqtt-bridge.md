# MQTT → ThermalTrace bridge

ThermalTrace does **not** run an MQTT broker. Keep Mosquitto / Home Assistant MQTT on your LAN, then mirror readings to cloud alerts and history over HTTPS.

## Endpoint

```http
POST https://thermaltrace.dev/api/ingest/mqtt
X-Ingest-Key: <device-key>
Content-Type: application/json
```

Accepted bodies:

```json
{ "topic": "home/garage/temp", "payload": "{\"temp1\":42.5,\"humidity\":38}" }
```

```json
{ "topic": "home/garage/temp", "message": { "temp1": 42.5, "humidity": 38 } }
```

The Worker unwraps `payload` / `message` and forwards into the same path as `POST /api/ingest/<key>`. Map those JSON keys under **Dashboard → Devices**.

## Home Assistant (MQTT trigger → HTTP)

For automatic entities without YAML, use the [official HACS integration](https://github.com/doodersrage/thermatrace-HACS-component) ([product guide](https://thermaltrace.dev/integrations/home-assistant)).

Manual MQTT → HTTP bridge:

1. Create a push device and copy the ingest key.
2. Map sensor keys to match your MQTT JSON.  
3. Automation sketch:

```yaml
alias: ThermalTrace MQTT bridge
trigger:
  - platform: mqtt
    topic: home/garage/temp
action:
  - service: rest_command.thermaltrace_ingest
```

```yaml
# configuration.yaml
rest_command:
  thermaltrace_ingest:
    url: "https://thermaltrace.dev/api/ingest/mqtt"
    method: POST
    headers:
      Content-Type: application/json
      X-Ingest-Key: !secret thermaltrace_ingest_key
    payload: >
      {"topic":"{{ trigger.topic }}","payload":{{ trigger.payload }}}
```

Put `thermaltrace_ingest_key` in `secrets.yaml`. If your MQTT payload is already a JSON object string, the bridge parses it; if it is a bare number, wrap it in Node-RED or a template first.

## Node-RED

Import [`/nodered/mqtt-to-thermaltrace.json`](https://thermaltrace.dev/nodered/mqtt-to-thermaltrace.json):

1. Set your Mosquitto broker on the **mqtt in** node.  
2. Set env `THERMALTRACE_INGEST_KEY` (or edit the function node).  
3. Confirm the topic matches your ESP publish path.  
4. Deploy and watch the debug node for HTTP `200`.

## Dual-run tip

Keep local automations on MQTT. Use ThermalTrace for household freeze SMS/email, history, and share links—without exposing the broker to the internet.

Product walkthrough: [Adding devices](https://thermaltrace.dev/about/adding-devices#mqtt-bridge) · Compare: [vs DIY MQTT](https://thermaltrace.dev/compare/diy-mqtt)
