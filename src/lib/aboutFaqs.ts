import type { AboutContentBlock } from "./aboutExpandedContent";

export type AboutFaqItem = {
  question: string;
  answer: string;
};

/** FAQ copy for high-intent guides (FAQPage JSON-LD + optional on-page list). */
export const aboutFaqsBySlug: Record<string, AboutFaqItem[]> = {
  "temperature-probes": [
    {
      question: "What temperature probes work with ThermalTrace?",
      answer:
        "Any sensor that can publish temperature (and optional humidity) as JSON—commonly DHT22, DS18B20, or similar on Arduino/ESP32. Map probe indexes in the dashboard after ingest.",
    },
    {
      question: "How many probes do I need in a garage?",
      answer:
        "One probe is a start; two or three zones (door bay, north wall, workbench) catch freeze risk that a single average misses.",
    },
  ],
  "temperature-changes": [
    {
      question: "Why does garage temperature swing so fast?",
      answer:
        "Door openings, sun load on walls, wind infiltration, and vehicle heat move indoor air quickly. Chart history overnight to separate weather from sensor noise.",
    },
  ],
  "historical-data": [
    {
      question: "How long does ThermalTrace keep history?",
      answer:
        "Retention depends on plan and your Settings retention window. Free keeps shorter windows; paid tiers keep more history for charts and CSV export.",
    },
    {
      question: "Can I export readings to a spreadsheet?",
      answer:
        "Yes on Member and Pro—download CSV from History and open it in Excel or Google Sheets for freeze audits and seasonal comparisons.",
    },
  ],
  "arduino-sketches": [
    {
      question: "Where are sample Arduino sketches?",
      answer:
        "In the thermaltrace GitHub repo under sketches/, plus the Arduino guides in About. Copy the ingest URL with your device key into the sketch constants.",
    },
  ],
  "arduino-pin-wiring": [
    {
      question: "Which pins should I use for a DHT22?",
      answer:
        "Use a free digital GPIO for the data line, 3.3V or 5V per your board and sensor rating, and a shared ground. Avoid pins reserved by Ethernet/SPI shields.",
    },
  ],
  "arduino-dht22-lcd": [
    {
      question: "Do I need an LCD if I use ThermalTrace?",
      answer:
        "No—the cloud dashboard is enough. A local LCD is optional for workshop visibility when Wi‑Fi is down.",
    },
  ],
  "dht22-sensor-overview": [
    {
      question: "How accurate is a DHT22 in a garage?",
      answer:
        "Roughly ±0.5 °C and a few percent RH in stable air. Drafts and door openings create real spikes—not always sensor error. Compare zones before replacing hardware.",
    },
    {
      question: "How often should firmware poll the DHT22?",
      answer:
        "Respect at least a two-second gap between reads. Overlapping requests return stale or error values; sketches use timers and retries for that reason.",
    },
    {
      question: "Can one DHT22 cover a whole garage?",
      answer:
        "One sensor hides gradients. Door bays, north walls, and workbenches often differ by several degrees—use multiple probes when freeze risk or tools matter.",
    },
  ],
  "dht22-data-line-wiring": [
    {
      question: "Why do DHT22 reads fail intermittently?",
      answer:
        "Long cables, missing pull-ups, shared power noise, and reading too often are common causes. Shorten the run, verify wiring, and add retries with backoff.",
    },
  ],
  "freeze-protection-thresholds": [
    {
      question: "What freeze threshold should I start with?",
      answer:
        "Many garages start near 35–38 °F so you get warning before pipes are at hard freeze. Tune after you see overnight lows in your coldest zone.",
    },
    {
      question: "Should I alert on outdoor forecast or indoor probes?",
      answer:
        "Use both when you can: probes catch your space; forecast and NWS alerts catch regional cold snaps before indoor air has dropped.",
    },
  ],
  "cold-snap-playbook": [
    {
      question: "What should I do when a freeze alert fires?",
      answer:
        "Acknowledge it, check the coldest zone and door state, open quiet-hour bypass if needed, and escalate channels if nobody responds within your playbook window.",
    },
    {
      question: "How do quiet hours interact with freeze alerts?",
      answer:
        "You can suppress routine noise overnight while still delivering freeze, flood, and forecast alerts—keep bypass enabled for critical kinds.",
    },
  ],
  "alert-channel-cookbook": [
    {
      question: "Which channels work on the free plan?",
      answer:
        "Email plus chat-style destinations (Discord, Telegram, Slack, Teams, ntfy, Pushover). SMS, WhatsApp, browser push, and outbound webhooks need Pro.",
    },
    {
      question: "Why did a channel get skipped?",
      answer:
        "A checked channel without a destination (phone, webhook URL, chat id) is skipped at send time. Fill destinations, save, then send a test alert.",
    },
  ],
  "household-sharing-walkthrough": [
    {
      question: "Can household members change alert settings?",
      answer:
        "Editors and owners can; view-only members see live data without changing devices, alerts, or sharing.",
    },
    {
      question: "Do invites require a paid plan?",
      answer:
        "Household sharing is available on free accounts so family can watch the same probes and alerts together.",
    },
  ],
  "accounts-and-dashboard": [
    {
      question: "What should I configure after creating an account?",
      answer:
        "Add a device, map probes, set freeze thresholds, pick alert channels, invite household members, and optionally start a Pro trial for SMS or share links.",
    },
  ],
  "ingest-and-webhooks": [
    {
      question: "Do I need a public IP on the Arduino?",
      answer:
        "No. Push ingest posts outbound to ThermalTrace with a device key. Pull feeds need a reachable HTTPS JSON URL if you use that path instead.",
    },
    {
      question: "What belongs in an ingest payload?",
      answer:
        "Temperature (and humidity) keyed by probe index, plus optional door/power fields, battery, and RSSI. Native shapes are flat keys, a temp object, or sensors[]. SenML (RFC 8428) arrays and Home Assistant REST state JSON are also auto-detected. Keep keys stable so dashboard mappings stay valid.",
    },
  ],
  "adding-devices": [
    {
      question: "Should I use push or pull?",
      answer:
        "Use push for ESP/Arduino nodes that can POST outbound HTTPS. Use pull when you already have a public HTTPS JSON feed (or a TLS relay) that ThermalTrace can fetch on a schedule.",
    },
    {
      question: "Why don’t readings show on Home after ingest succeeds?",
      answer:
        "POST JSON first — sensor keys auto-import on Devices. If Home is still empty, confirm the device received a POST and check Devices → Device health. Pull feeds: correct JSON root (default temp) unless the URL returns SenML or Home Assistant REST JSON, which auto-detect.",
    },
  ],
  "json-probe-output-schema": [
    {
      question: "What JSON shape does ThermalTrace expect?",
      answer:
        "Default pull shape is a temp object with probe keys (f, c, h). Push also accepts flat keys, sensors[], SenML JSON arrays, and Home Assistant REST state objects. Optional battery_pct and rssi help diagnose weak devices. See /about/ingest-and-webhooks or the example feed at /api/feeds/example?format=document.",
    },
  ],
  "kit-qr-onboarding": [
    {
      question: "What does a kit QR code contain?",
      answer:
        "Usually the ingest URL or onboarding deep link for that device so a phone scan finishes setup without typing long keys.",
    },
  ],
  "esp32-ota-firmware": [
    {
      question: "Can ESP32 devices update firmware while posting to ThermalTrace?",
      answer:
        "Yes—run OTA on your LAN for firmware, and keep push ingest posting readings to the cloud API. Battery and RSSI fields are optional in the payload.",
    },
  ],
  "install-pwa": [
    {
      question: "Does the PWA support freeze push alerts?",
      answer:
        "Push is a Pro channel for the browser (PWA) and the ThermalTrace Android app. Install the PWA or Android app, enable Push under Alerts, and allow notifications where the OS requires it (iOS Safari has extra limits for web push).",
    },
  ],
  "data-flow": [
    {
      question: "How do readings reach the dashboard?",
      answer:
        "Devices push or feeds are pulled, readings land in storage, charts poll or stream updates, and alert jobs evaluate thresholds on a schedule.",
    },
  ],
  "debugging-stale-readings": [
    {
      question: "Why are my garage readings stale?",
      answer:
        "Check device power and Wi‑Fi, verify the ingest key, confirm cron/history jobs on System status, and look for gaps in History before replacing sensors.",
    },
  ],
  "group-membership-model": [
    {
      question: "What is the difference between editor and view-only?",
      answer:
        "Editors can change devices, alerts, and sharing. View-only members watch live data and history without changing household configuration.",
    },
  ],
  "temperature-probe-case-study": [
    {
      question: "What did the probe case study conclude?",
      answer:
        "Multi-zone probes plus freeze thresholds catch cold events single sensors miss—especially near doors and uninsulated walls during polar snaps.",
    },
  ],
  "multi-zone-garage-layout": [
    {
      question: "Where should I place probes for freeze risk?",
      answer:
        "Prioritize the coldest expected zones: north walls, door tracks, and exterior corners—not only the workbench where you stand.",
    },
  ],
  "probe-demo": [
    {
      question: "Is the probe demo real hardware?",
      answer:
        "No—it simulates three zones so you can see how outdoor air, sun load, and door state change JSON output like a live feed.",
    },
  ],
  "zapier-make-recipes": [
    {
      question: "Can I connect ThermalTrace to Zapier or Make?",
      answer:
        "Yes on Pro via outbound webhooks for alerts and inbound tokens for actions like snooze. Recipes live in the Zapier/Make guides under About.",
    },
  ],
  "csv-export-spreadsheet-analysis": [
    {
      question: "What can I do with CSV exports?",
      answer:
        "Audit overnight lows, compare seasons, and document freeze near-misses for insurance or workshop planning in any spreadsheet tool.",
    },
  ],
  "esphome-shelly-recipes": [
    {
      question: "Do I need to stop using Home Assistant MQTT?",
      answer:
        "No. Many households dual-run: Mosquitto locally for automations, plus HTTPS push ingest for ThermalTrace freeze SMS and history.",
    },
    {
      question: "Which Shelly models work?",
      answer:
        "Any Shelly that can send an HTTP POST (Plus / Gen2 scripting or webhook actions). Map the door key under Dashboard → Devices after the first POST.",
    },
  ],
  "garage-door-cold-playbook": [
    {
      question: "Can I alert on door open alone?",
      answer:
        "Yes with a door-open rule, but pairing door + temperature below threshold reduces false alarms when you are working in a warm garage.",
    },
    {
      question: "Where do I create the combined rule?",
      answer:
        "Dashboard → Alerts → Rules. Add conditions for door open (or door open duration) AND temperature below your freeze threshold, then save and send a test alert.",
    },
  ],
  "personal-weather-stations": [
    {
      question: "Do I still need OpenWeather?",
      answer:
        "OpenWeather is the default and fallback. Personal stations replace the outdoor card and improve NWS/forecast context at your yard.",
    },
    {
      question: "Where are my Ambient/WeatherFlow keys stored?",
      answer:
        "In your account metadata (Dashboard → Settings), same as display preferences — not in the public git repo.",
    },
  ],
};

export function getAboutFaqs(slug: string): AboutFaqItem[] {
  return aboutFaqsBySlug[slug] ?? [];
}

/** Convert FAQ items into AboutContentBlock list for article footers. */
export function aboutFaqsToBlocks(faqs: AboutFaqItem[]): AboutContentBlock[] {
  if (faqs.length === 0) return [];
  return [
    { type: "h2", text: "FAQ" },
    ...faqs.flatMap((faq) => [
      {
        type: "p" as const,
        html: `<strong>${faq.question}</strong><br />${faq.answer}`,
      },
    ]),
  ];
}
