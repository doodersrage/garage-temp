export type CompareGuide = {
  slug: string;
  path: string;
  title: string;
  headline: string;
  description: string;
  competitor: string;
  summary: string;
  lede: string;
  whenThermalTrace: string[];
  whenOther: string[];
  rows: Array<{ capability: string; thermaltrace: string; other: string }>;
};

export const compareGuides: CompareGuide[] = [
  {
    slug: "diy-mqtt",
    path: "/compare/diy-mqtt",
    title: "ThermalTrace vs DIY MQTT",
    headline: "ThermalTrace vs DIY MQTT + Node-RED",
    description:
      "Compare ThermalTrace garage freeze alerts to a self-hosted MQTT, Node-RED, and cron stack—ops burden, SMS, history, and household sharing.",
    competitor: "DIY MQTT / Node-RED",
    summary:
      "DIY MQTT is powerful if you enjoy running brokers, dashboards, and alert scripts. ThermalTrace is the same outcome—live probes, freeze alerts, history—without babysitting the stack at 2 a.m.",
    lede:
      "A Mosquitto broker, Node-RED flows, and a cron job can freeze-alert a garage. The cost is patching, TLS, Twilio, and a Pi that has to stay up. ThermalTrace is the hosted alerts and history layer: keep MQTT on the LAN if you want, bridge readings over HTTPS, and let household freeze channels live in the cloud.",
    whenThermalTrace: [
      "You want freeze SMS/email/push without wiring Twilio yourself",
      "Household members need access without VPN to your Pi",
      "You still use ESP/Arduino—HTTPS ingest or MQTT→HTTP bridge",
    ],
    whenOther: [
      "You already run a hardened MQTT + Grafana stack and like maintaining it",
      "Every automation must stay fully on-LAN with no cloud dependency",
      "You need custom industrial protocols ThermalTrace does not speak",
    ],
    rows: [
      { capability: "Broker / server upkeep", thermaltrace: "Hosted (no Mosquitto to patch)", other: "You patch Mosquitto/HA" },
      { capability: "Freeze alerts", thermaltrace: "Built-in channels", other: "Node-RED + Twilio/email" },
      { capability: "ESP ingest", thermaltrace: "HTTPS device key or MQTT bridge", other: "MQTT topic design" },
      { capability: "History & CSV", thermaltrace: "Member+", other: "Influx/Postgres you manage" },
      { capability: "Share with family", thermaltrace: "Household invites", other: "VPN or reverse proxy" },
    ],
  },
  {
    slug: "govee",
    path: "/compare/govee",
    title: "ThermalTrace vs Govee",
    headline: "ThermalTrace vs Govee sensors",
    description:
      "Govee Bluetooth/Wi-Fi hygrometers vs ThermalTrace for garage freeze monitoring—alerts, ESP ingest, multi-probe spaces, and export.",
    competitor: "Govee",
    summary:
      "Govee is great for cheap room sensors and a polished phone app. ThermalTrace is built for garage/workshop freeze workflows: your own ESP probes, household alerts, and history you can export.",
    lede:
      "Govee hygrometers win on price and a friendly phone app for bedrooms and closets. They are weaker in a detached garage: Bluetooth range, vendor lock-in, and alerts that mostly stay in-app. ThermalTrace assumes you bring an ESP32, then gives household freeze routing and a season of exportable history.",
    whenThermalTrace: [
      "You want ESP/Arduino probes you control (not only vendor pods)",
      "Freeze alerts need SMS, webhooks, or household routing",
      "You care about CSV/history across a whole cold season",
    ],
    whenOther: [
      "You only need a few battery Bluetooth sensors indoors",
      "You prefer an all-in-one consumer app with no DIY hardware",
      "Garage Wi-Fi is impossible and Bluetooth range is enough",
    ],
    rows: [
      { capability: "Hardware", thermaltrace: "BYO ESP/Arduino", other: "Govee pods" },
      { capability: "Garage / detached spaces", thermaltrace: "Designed for it", other: "Hit-or-miss range" },
      { capability: "Alert channels", thermaltrace: "Email, SMS, push, chat, webhooks", other: "Mostly app push" },
      { capability: "Data export", thermaltrace: "CSV / API (paid tiers)", other: "Limited" },
      { capability: "Multi-user household", thermaltrace: "Included", other: "Account sharing awkward" },
    ],
  },
  {
    slug: "tempest",
    path: "/compare/tempest",
    title: "ThermalTrace vs Tempest",
    headline: "ThermalTrace vs WeatherFlow Tempest",
    description:
      "Outdoor weather stations like Tempest vs ThermalTrace indoor garage probes—when you need pipe freeze alerts where the water actually is.",
    competitor: "WeatherFlow Tempest",
    summary:
      "Tempest shines at yard weather—wind, rain, outdoor temp. Pipe freeze risk lives indoors. ThermalTrace watches the garage, crawlspace, or shop where the plumbing is.",
    lede:
      "A Tempest on the roof tells you outdoor air, wind, and rain with excellent fidelity. Pipes freeze where the water is—usually a garage, crawlspace, or shop the station never sees. Use Tempest for yard weather and ThermalTrace for the indoor probe that sits by the plumbing.",
    whenThermalTrace: [
      "You need indoor / garage probe temps for pipe risk",
      "Alerts should fire on space temperature, not only outdoor air",
      "You already have or want DIY sensors on Wi-Fi",
    ],
    whenOther: [
      "You want a best-in-class outdoor personal weather station",
      "Your goal is hyper-local forecast and storm data",
      "You do not have indoor plumbing freeze risk",
    ],
    rows: [
      { capability: "Primary job", thermaltrace: "Indoor freeze / space monitoring", other: "Outdoor weather" },
      { capability: "Probe location", thermaltrace: "Garage, crawlspace, closet", other: "Roof / yard" },
      { capability: "Freeze alerts on pipes", thermaltrace: "Direct", other: "Infer from outdoor only" },
      { capability: "DIY ESP ingest", thermaltrace: "Yes", other: "N/A" },
      { capability: "Complements the other?", thermaltrace: "Yes — use both", other: "Yes — outdoor context" },
    ],
  },
  {
    slug: "nest",
    path: "/compare/nest",
    title: "ThermalTrace vs Nest Thermostat",
    headline: "ThermalTrace vs a Nest Thermostat for garage freeze protection",
    description:
      "A Nest thermostat runs your home's conditioned living space -- it has no signal from an unheated garage. Compare that to a dedicated ThermalTrace probe, which can now show your Nest's reading alongside every freeze alert.",
    competitor: "Nest Thermostat",
    summary:
      "Nest is excellent at running your HVAC and reporting the temperature where it (or a Nest Temperature Sensor) is installed -- almost never the garage, crawlspace, or shop where pipes actually freeze. ThermalTrace watches that space directly, and if you connect your Nest account, pulls its reading and heating status into every freeze alert for context.",
    lede:
      "Nest does one job very well: run the furnace and track the temperature of the room it's in. An unheated garage, crawlspace, or workshop is unconditioned by design, so Nest has no reading from it at all -- there's nothing to alert on. ThermalTrace puts a dedicated probe in that space, and if you connect your Nest account (Pro), every freeze alert shows your house's indoor temperature and whether it's actively heating, so you can tell at a glance whether the cold is expected (garage is unconditioned, house is fine) or something's actually wrong.",
    whenThermalTrace: [
      "You have a garage, crawlspace, basement, or shop that isn't on Nest's heating loop",
      "You want an alert from the specific unconditioned space, not an inference from the thermostat",
      "You already use Nest and want its reading shown alongside freeze alerts, not replaced",
    ],
    whenOther: [
      "You only need the temperature of Nest-conditioned living space",
      "You want to control heating/cooling schedules, not just monitor a cold space",
      "You don't have a separate unconditioned space that needs its own probe",
    ],
    rows: [
      { capability: "Primary job", thermaltrace: "Freeze/leak monitoring for any space", other: "HVAC control for conditioned space" },
      { capability: "Sees an unheated garage/crawlspace", thermaltrace: "Yes — dedicated probe", other: "No — unconditioned spaces aren't on the loop" },
      { capability: "Freeze/leak alerts (SMS, push, email)", thermaltrace: "Yes", other: "No" },
      { capability: "Shows thermostat reading on freeze alerts", thermaltrace: "Yes, if connected (Pro)", other: "N/A" },
      { capability: "Controls heating schedules", thermaltrace: "No", other: "Yes" },
      { capability: "Complements the other?", thermaltrace: "Yes — connect both", other: "Yes — connect both" },
    ],
  },
  {
    slug: "ecobee",
    path: "/compare/ecobee",
    title: "ThermalTrace vs Ecobee Thermostat",
    headline: "ThermalTrace vs an Ecobee Thermostat for garage freeze protection",
    description:
      "An Ecobee thermostat runs your home's conditioned living space -- it has no signal from an unheated garage. Compare that to a dedicated ThermalTrace probe, which can now show your Ecobee's reading alongside every freeze alert.",
    competitor: "Ecobee Thermostat",
    summary:
      "Ecobee is excellent at running your HVAC and reporting the temperature where it (or an Ecobee SmartSensor) is installed -- almost never the garage, crawlspace, or shop where pipes actually freeze. ThermalTrace watches that space directly, and if you connect your Ecobee account, pulls its reading and heating status into every freeze alert for context.",
    lede:
      "Ecobee does one job very well: run the furnace and track the temperature of the room it's in. An unheated garage, crawlspace, or workshop is unconditioned by design, so Ecobee has no reading from it at all -- there's nothing to alert on. ThermalTrace puts a dedicated probe in that space, and if you connect your Ecobee account (Pro), every freeze alert shows your house's indoor temperature and whether it's actively heating, so you can tell at a glance whether the cold is expected (garage is unconditioned, house is fine) or something's actually wrong.",
    whenThermalTrace: [
      "You have a garage, crawlspace, basement, or shop that isn't on Ecobee's heating loop",
      "You want an alert from the specific unconditioned space, not an inference from the thermostat",
      "You already use Ecobee and want its reading shown alongside freeze alerts, not replaced",
    ],
    whenOther: [
      "You only need the temperature of Ecobee-conditioned living space",
      "You want to control heating/cooling schedules, not just monitor a cold space",
      "You don't have a separate unconditioned space that needs its own probe",
    ],
    rows: [
      { capability: "Primary job", thermaltrace: "Freeze/leak monitoring for any space", other: "HVAC control for conditioned space" },
      { capability: "Sees an unheated garage/crawlspace", thermaltrace: "Yes — dedicated probe", other: "No — unconditioned spaces aren't on the loop" },
      { capability: "Freeze/leak alerts (SMS, push, email)", thermaltrace: "Yes", other: "No" },
      { capability: "Shows thermostat reading on freeze alerts", thermaltrace: "Yes, if connected (Pro)", other: "N/A" },
      { capability: "Controls heating schedules", thermaltrace: "No", other: "Yes" },
      { capability: "Complements the other?", thermaltrace: "Yes — connect both", other: "Yes — connect both" },
    ],
  },
];

export function getCompareGuide(slug: string): CompareGuide | undefined {
  return compareGuides.find((g) => g.slug === slug);
}
