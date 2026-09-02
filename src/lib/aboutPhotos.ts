import type { ImageMetadata } from "astro";
import arduinoDht11 from "../assets/about-photos/arduino-dht11.jpg";
import arduinoUnoBoard from "../assets/about-photos/arduino-uno-board.jpg";
import atticInsulation from "../assets/about-photos/attic-insulation.jpg";
import basementPexPipes from "../assets/about-photos/basement-pex-pipes.jpg";
import coldWeatherRoad from "../assets/about-photos/cold-weather-road.jpg";
import crawlspace from "../assets/about-photos/crawlspace.jpg";
import deskWorkspace from "../assets/about-photos/desk-workspace.jpg";
import dht22Module from "../assets/about-photos/dht22-module.jpg";
import ethernetCable from "../assets/about-photos/ethernet-cable.jpg";
import frostWindow from "../assets/about-photos/frost-window.jpg";
import frozenThermometer from "../assets/about-photos/frozen-thermometer.jpg";
import garageWorkbench from "../assets/about-photos/garage-workbench.jpg";
import greenhouse from "../assets/about-photos/greenhouse.jpg";
import homeWorkshop from "../assets/about-photos/home-workshop.jpg";
import networkSwitch from "../assets/about-photos/network-switch.jpg";
import serverRack from "../assets/about-photos/server-rack.jpg";
import snowCabins from "../assets/about-photos/snow-cabins.jpg";
import utilityPipes from "../assets/about-photos/utility-pipes.jpg";

export type AboutPhotoId =
  | "arduino-dht11"
  | "arduino-uno-board"
  | "attic-insulation"
  | "basement-pex-pipes"
  | "cold-weather-road"
  | "crawlspace"
  | "desk-workspace"
  | "dht22-module"
  | "ethernet-cable"
  | "frost-window"
  | "frozen-thermometer"
  | "garage-workbench"
  | "greenhouse"
  | "home-workshop"
  | "network-switch"
  | "server-rack"
  | "snow-cabins"
  | "utility-pipes";

export type AboutPhoto = {
  id: AboutPhotoId;
  image: ImageMetadata;
  alt: string;
  /** Short on-page caption (not a duplicate of alt). */
  caption: string;
  /** Attribution line required by the license. */
  credit: string;
  license: string;
  sourceUrl: string;
};

/**
 * Curated Creative Commons / public-domain photos for About guides, stories, and compare pages.
 * Prefer topical photos over reusing project bench shots on unrelated pages.
 * Do not use these in signed-in dashboard UI.
 */
export const aboutPhotos: Record<AboutPhotoId, AboutPhoto> = {
  "frost-window": {
    id: "frost-window",
    image: frostWindow,
    alt: "Fern-like frost crystals covering a dark window pane",
    caption: "Frost patterns form when moist air meets a surface below freezing.",
    credit: "Photo: Muffet / Flickr — CC BY 2.0",
    license: "CC BY 2.0",
    sourceUrl: "https://www.flickr.com/photos/53133240@N00/74115299",
  },
  "utility-pipes": {
    id: "utility-pipes",
    image: utilityPipes,
    alt: "Copper water pipes, shut-off valve, and meter on a concrete utility wall",
    caption: "Freeze alerts matter most near exposed plumbing and uninsulated walls.",
    credit: "Photo: mathplourde / Flickr — CC BY 2.0",
    license: "CC BY 2.0",
    sourceUrl: "https://www.flickr.com/photos/23311795@N04/3793183731",
  },
  "basement-pex-pipes": {
    id: "basement-pex-pipes",
    image: basementPexPipes,
    alt: "Blue PEX and copper water lines with valves in a basement ceiling",
    caption: "Supply lines in basements and crawlspaces are the freeze risk that history charts prove.",
    credit: "Photo: Tomwsulcer — CC0",
    license: "CC0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:PEX_pipes_and_valves_in_basement_ceiling_for_exterior_water_spigot.jpg",
  },
  "crawlspace": {
    id: "crawlspace",
    image: crawlspace,
    alt: "Low crawlspace under a house with soil floor and foundation walls",
    caption: "Crawlspaces and underfloor bays swing colder than living space—probe placement matters.",
    credit: "Photo: Boatbuilder — CC BY-SA 3.0",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Crawle_space1.jpg",
  },
  "attic-insulation": {
    id: "attic-insulation",
    image: atticInsulation,
    alt: "Installer placing fiberglass batt insulation between attic roof rafters",
    caption: "Attics and roofs swing hard—insulation and probe placement decide what you actually measure.",
    credit: "Photo: The EnergySmart Academy — CC0",
    license: "CC0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Installing_installation_in_an_attic_(9337).jpg",
  },
  "greenhouse": {
    id: "greenhouse",
    image: greenhouse,
    alt: "Small backyard greenhouse with grapevines growing out through the roof vents",
    caption: "Greenhouses and shops need humidity and heat watch—not just freeze thresholds.",
    credit: "Photo: W.carter — CC0",
    license: "CC0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Small_greenhouse_with_grapevines_escaping.jpg",
  },
  "frozen-thermometer": {
    id: "frozen-thermometer",
    image: frozenThermometer,
    alt: "Outdoor thermometer iced over with frost on the dial and housing",
    caption: "Outdoor air can look fine while a cold corner of the garage is already below threshold.",
    credit: "Photo: August Geyler — CC BY-SA 4.0",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Eingefrorenes_Au%C3%9Fenthermometer.jpg",
  },
  "network-switch": {
    id: "network-switch",
    image: networkSwitch,
    alt: "Stack of network switches with ethernet cables plugged into front ports",
    caption: "Pull feeds, MQTT bridges, and LAN relays often land on a switch before they leave the site.",
    credit: "Photo: ShakataGaNai — CC BY-SA 3.0",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Network_switches.jpg",
  },
  "cold-weather-road": {
    id: "cold-weather-road",
    image: coldWeatherRoad,
    alt: "Person in extreme cold holding an outdoor thermometer reading far below zero",
    caption: "Regional cold snaps can outpace what outdoor weather apps imply for an attached garage, shop, or crawlspace.",
    credit: "Photo: Bureau of Land Management — public domain",
    license: "Public domain",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Cold_weather_on_the_Dalton_Highway_(49494853936).jpg",
  },
  "snow-cabins": {
    id: "snow-cabins",
    image: snowCabins,
    alt: "Snow-covered mountain cabins with deep drifts against timber walls",
    caption: "Empty cabins fail silently mid-week—alerts matter when nobody is on site.",
    credit: "Photo: Tahoe Signature Properties — CC BY-SA 4.0",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Snowy_Mountain_Cabins.jpg",
  },
  "server-rack": {
    id: "server-rack",
    image: serverRack,
    alt: "Rows of lit server racks in a dense data-center aisle",
    caption: "Closets and homelab racks need high-temp watch as much as garages need freeze alerts.",
    credit: "Photo: Carl Lender / Flickr — CC BY 2.0",
    license: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Server_Room_(22397102849).jpg",
  },
  "dht22-module": {
    id: "dht22-module",
    image: dht22Module,
    alt: "Aosong AM2302 DHT22 temperature and humidity sensor module on a black breakout board",
    caption: "The DHT22 (AM2302) is the digital humidity–temperature sensor used in many DIY space builds.",
    credit: "Photo: Suyash Dwivedi — CC BY-SA 4.0",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:AM2302_(DHT22)_digital_temperature_and_humidity_sensor_module.jpg",
  },
  "arduino-uno-board": {
    id: "arduino-uno-board",
    image: arduinoUnoBoard,
    alt: "Top view of a blue Arduino Uno microcontroller board on a white background",
    caption: "Arduino-compatible boards run the sketch that polls probes and publishes JSON.",
    credit: "Photo: Wikimedia Commons contributor — CC0",
    license: "CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Arduino_Uno_board.jpg",
  },
  "arduino-dht11": {
    id: "arduino-dht11",
    image: arduinoDht11,
    alt: "Arduino Uno wired to a DHT temperature-humidity sensor with three jumper wires",
    caption: "A minimal MCU-plus-sensor bring-up before Ethernet, LCD, and dual-probe wiring.",
    credit: "Photo: Wikimedia Commons contributor — CC BY-SA 4.0",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Arduino_uno_dht11.jpg",
  },
  "garage-workbench": {
    id: "garage-workbench",
    image: garageWorkbench,
    alt: "Bench grinder on a wooden workbench against a brick garage wall with tools",
    caption: "Workshops and garages swing harder than living space—placement beats sensor brand.",
    credit: "Photo: Shixart1985 — CC BY 2.0",
    license: "CC BY 2.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Workshop_scene_shows_workbench_with_a_tool_and_materials_in_a_garage_setting.jpg",
  },
  "home-workshop": {
    id: "home-workshop",
    image: homeWorkshop,
    alt: "Cluttered home workshop with workbench, tools, lumber, and packed shelves",
    caption: "Humidity and temperature swings matter when tools, wood, and paint share the same bay.",
    credit: "Photo: danielmee33 / Flickr — CC BY 2.0",
    license: "CC BY 2.0",
    sourceUrl: "https://www.flickr.com/photos/8432632@N04/28260557796",
  },
  "ethernet-cable": {
    id: "ethernet-cable",
    image: ethernetCable,
    alt: "Close-up of white Cat-5e Ethernet cables with RJ45 connectors",
    caption: "Probe JSON usually leaves the LAN over Ethernet or a nearby relay—not the public internet directly.",
    credit: "Photo: DiscDepotDundee.co.uk — CC BY-SA 4.0",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Cat-5e_Ethernet_network_cable_RJ45_end_connectors.jpg",
  },
  "desk-workspace": {
    id: "desk-workspace",
    image: deskWorkspace,
    alt: "Home desk with laptop, external monitor, and keyboard in a living space",
    caption: "Household members check the same dashboard from wherever they already work.",
    credit: "Photo: David Wellbeloved / Flickr — CC BY 2.0",
    license: "CC BY 2.0",
    sourceUrl: "https://www.flickr.com/photos/35339157@N00/5378333486",
  },
};

/** Hero photo overrides for guides that benefit from atmosphere or topical hardware. */
export const aboutHeroPhotoBySlug: Partial<Record<string, AboutPhotoId>> = {
  // Freeze / alerts / weather / spaces
  "cold-snap-playbook": "frost-window",
  "freeze-protection-thresholds": "basement-pex-pipes",
  "alert-channel-cookbook": "cold-weather-road",
  "seasonal-garage-patterns": "frost-window",
  "weather-api-parallel-path": "cold-weather-road",
  "humidity-condensation-basics": "frost-window",
  "temperature-changes": "home-workshop",
  "temperature-probes": "dht22-module",

  // Probes / garage / crawlspace context
  "dht22-sensor-overview": "dht22-module",
  "dht22-data-line-wiring": "arduino-dht11",
  "dht22-read-errors-retries": "dht22-module",
  "probe-mounting-enclosures": "garage-workbench",
  "probe-mapping-labels": "dht22-module",
  "probe-cable-length-limits": "ethernet-cable",
  "multi-zone-garage-layout": "home-workshop",
  "garage-door-temperature-swings": "garage-workbench",
  "sun-load-garage-walls": "home-workshop",
  "infiltration-wind-drafts": "crawlspace",
  "thermal-mass-concrete-slab": "crawlspace",
  "hvac-duct-influence": "attic-insulation",
  "stored-vehicle-heat": "garage-workbench",
  "enclosure-ventilation": "greenhouse",
  "sensor-warm-up-time": "dht22-module",
  "dual-probe-averaging": "dht22-module",

  // Arduino / firmware / wiring
  "arduino-ide-setup": "arduino-uno-board",
  "arduino-sketches": "arduino-uno-board",
  "arduino-circuit-wiring": "arduino-dht11",
  "arduino-pin-wiring": "arduino-dht11",
  "arduino-dht22-lcd": "dht22-module",
  "sketch-polling-main-loop": "arduino-uno-board",
  "ethernet-shield-stacking": "ethernet-cable",
  "breadboard-power-rails": "arduino-dht11",
  "firmware-watchdog-recovery": "arduino-uno-board",
  "json-probe-output-schema": "ethernet-cable",
  "circuit-wiring-troubleshooting": "arduino-dht11",
  "liquid-crystal-gpio-map": "arduino-uno-board",
  "spi-pins-ethernet-reserved": "ethernet-cable",
  "lcd-local-display-format": "arduino-uno-board",
  "lcd-i2c-alternative": "arduino-uno-board",
  "serial-debugging-tips": "arduino-dht11",
  "library-dependencies": "arduino-uno-board",
  "ground-loop-avoidance": "arduino-dht11",
  "backlight-pwm-options": "arduino-uno-board",
  "jumper-wire-standards": "arduino-dht11",
  "ingest-and-webhooks": "ethernet-cable",
  "adding-devices": "ethernet-cable",
  "kit-qr-onboarding": "ethernet-cable",
  "esp32-ota-firmware": "arduino-uno-board",

  // Relay / network / data path
  "debugging-stale-readings": "ethernet-cable",
  "static-ip-vs-dhcp": "network-switch",
  "docker-relay-deployment": "network-switch",
  "fastapi-relay-setup": "ethernet-cable",
  "redis-cache-for-feeds": "network-switch",
  "relay-security-and-access": "ethernet-cable",
  "health-check-endpoints": "network-switch",
  "environment-variables-relay": "ethernet-cable",
  "caching-feed-responses": "ethernet-cable",
  "home-page-probe-fetch": "ethernet-cable",
  "configuring-temperature-feeds": "ethernet-cable",
  "websocket-live-updates": "ethernet-cable",
  "python-feeds": "ethernet-cable",
  "data-flow": "ethernet-cable",

  // Dashboard / accounts / product
  "history-dashboard-browsing": "desk-workspace",
  "historical-data": "desk-workspace",
  "csv-export-spreadsheet-analysis": "desk-workspace",
  "charting-with-spreadsheets": "desk-workspace",
  "spotting-data-gaps": "desk-workspace",
  "household-sharing-walkthrough": "desk-workspace",
  "group-membership-model": "desk-workspace",
  "cookie-session-lifecycle": "desk-workspace",
  "supabase-auth-flow": "desk-workspace",
  "supabase-history-inserts": "desk-workspace",
  "stripe-csv-subscription": "desk-workspace",
  "admin-dashboard-features": "desk-workspace",
  "contact-form-admin-review": "desk-workspace",
  "display-preferences-deep-dive": "desk-workspace",
  "middleware-auth-patterns": "desk-workspace",
  "zapier-make-recipes": "desk-workspace",
  "esphome-shelly-recipes": "ethernet-cable",
  "garage-door-cold-playbook": "garage-workbench",
  "personal-weather-stations": "frozen-thermometer",
  "accounts-and-dashboard": "desk-workspace",
  "install-pwa": "desk-workspace",
  "thermostat-oauth": "ethernet-cable",

  // Stack / hosting (atmospheric, not literal)
  "astro-server-side-rendering": "desk-workspace",
  "astro-islands-and-hydration": "desk-workspace",
  "astro-applications": "desk-workspace",
  "cloudflare-workers-deployment": "ethernet-cable",
  "nextjs-monitoring-dashboards": "desk-workspace",
  "nextjs-node-applications": "desk-workspace",
  "node-express-api-patterns": "ethernet-cable",
  "comparing-full-stack-options": "desk-workspace",
  "env-secrets-cloudflare": "ethernet-cable",
  "tailwind-v4-setup": "desk-workspace",
  "hosting-cost-comparison": "desk-workspace",
};

export function getAboutPhoto(id: AboutPhotoId): AboutPhoto {
  return aboutPhotos[id];
}

export function getAboutHeroPhoto(slug: string): AboutPhoto | undefined {
  const id = aboutHeroPhotoBySlug[slug];
  return id ? aboutPhotos[id] : undefined;
}

/** Distinct editorial strips so hubs do not reuse the same four photos. */
export const aboutHubPhotoIds: AboutPhotoId[] = [
  "garage-workbench",
  "basement-pex-pipes",
  "crawlspace",
  "snow-cabins",
];

export const guidesHubPhotoIds: AboutPhotoId[] = [
  "dht22-module",
  "arduino-uno-board",
  "attic-insulation",
  "ethernet-cable",
];

export const compareHubPhotoIds: AboutPhotoId[] = [
  "home-workshop",
  "frozen-thermometer",
  "greenhouse",
  "network-switch",
];

export const storiesHubPhotoIds: AboutPhotoId[] = [
  "utility-pipes",
  "frost-window",
  "server-rack",
  "cold-weather-road",
];
