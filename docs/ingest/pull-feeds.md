# Pull feeds

If your probe already serves HTTPS JSON (Arduino Ethernet server, FastAPI relay, etc.), use a **pull feed** instead of push ingest.

1. **[Dashboard → Devices](https://thermaltrace.dev/dashboard/temperature)** → add a **pull** feed URL  
2. ThermalTrace fetches on the hourly cron and when you refresh live readings while signed in  
3. Map probe keys the same way as push devices  

## Expected shapes

Same JSON families as [push ingest](/ingest/): flat keys, classic `temp` object, or `sensors[]`.

## Relay pattern

When the MCU cannot do TLS:

```
[Probe HTTP] → [local FastAPI / nginx TLS] → [ThermalTrace pull URL]
```

See [python feeds](https://thermaltrace.dev/about/python-feeds) and the [fast-api-relay](https://github.com/doodersrage/fast-api-relay) repo.

## Push vs pull

| | Push | Pull |
|---|------|------|
| Who initiates | Your device | ThermalTrace |
| Firewall | Device needs outbound HTTPS | Feed URL must be publicly reachable |
| Auth | Per-device key in path | HTTPS URL (+ optional basic auth depending on feed) |
| Best for | ESP32 / battery nodes | Always-on LAN servers with a public tunnel or relay |
