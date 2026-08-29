export type CompareGuide = {
  slug: string;
  path: string;
  title: string;
  headline: string;
  description: string;
  competitor: string;
  summary: string;
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
    whenThermalTrace: [
      "You want freeze SMS/email/push without wiring Twilio yourself",
      "Household members need access without VPN to your Pi",
      "You still use ESP/Arduino—just point ingest at an HTTPS endpoint",
    ],
    whenOther: [
      "You already run a hardened MQTT + Grafana stack and like maintaining it",
      "Every automation must stay fully on-LAN with no cloud dependency",
      "You need custom industrial protocols ThermalTrace does not speak",
    ],
    rows: [
      { capability: "Broker / server upkeep", thermaltrace: "Hosted", other: "You patch Mosquitto/HA" },
      { capability: "Freeze alerts", thermaltrace: "Built-in channels", other: "Node-RED + Twilio/email" },
      { capability: "ESP ingest", thermaltrace: "HTTPS device key", other: "MQTT topic design" },
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
];

export function getCompareGuide(slug: string): CompareGuide | undefined {
  return compareGuides.find((g) => g.slug === slug);
}
