---
layout: home
title: ThermalTrace Docs
hero:
  name: ThermalTrace
  text: Developer documentation
  tagline: Push ingest, HTTP API, sensor sketches, and integrations for the open-source temperature dashboard.
  image:
    src: https://thermaltrace.dev/og-dashboard.png
    alt: ThermalTrace dashboard
  actions:
    - theme: brand
      text: Push ingest
      link: /ingest/
    - theme: alt
      text: OpenAPI / API
      link: /api/
    - theme: alt
      text: Live app
      link: https://thermaltrace.dev
features:
  - title: Push ingest
    details: POST JSON from ESP32, Arduino, or MicroPython to a per-device URL. Flat keys, classic temp objects, or typed sensors[].
    link: /ingest/
    linkText: Ingest reference
  - title: Sensor sketches
    details: Drop-in samples for DS18B20, MAX31855, and MAX6675 — Arduino and MicroPython — already in this repo.
    link: /sketches/
    linkText: Browse sketches
  - title: Alert webhooks
    details: Pro outbound webhooks with optional HMAC, plus Home Assistant blueprint and Zapier/Make hooks.
    link: /integrations/webhooks
    linkText: Webhook payloads
  - title: Metrics & Grafana
    details: Prometheus scrape endpoint with Bearer API keys and a bundled Grafana dashboard JSON.
    link: /integrations/grafana
    linkText: Grafana setup
  - title: Architecture
    details: Astro SSR on Cloudflare Workers, Supabase, households, and cron-driven alerts.
    link: /guide/architecture
    linkText: How it fits together
  - title: Product guides
    details: Long-form wiring, freeze playbooks, and journeys live on the app site About hub.
    link: https://thermaltrace.dev/about
    linkText: thermaltrace.dev/about
---

## Where to go

| Goal | Start here |
|------|------------|
| Wire an ESP and see live temps | [Push ingest](/ingest/) → [Sketches](/sketches/) |
| Automate on freeze alerts | [Alert webhooks](/integrations/webhooks) → [Home Assistant](/integrations/home-assistant) |
| Scrape metrics | [Grafana / Prometheus](/integrations/grafana) |
| Run the app locally | [Local development](/guide/local-dev) |
| Read product / DIY guides | [About hub](https://thermaltrace.dev/about) |

::: tip Repo links
Source: [github.com/doodersrage/thermaltrace](https://github.com/doodersrage/thermaltrace) ·  
This docs site: [doodersrage.github.io/thermaltrace](https://doodersrage.github.io/thermaltrace/) ·  
Production app: [thermaltrace.dev](https://thermaltrace.dev)
:::
