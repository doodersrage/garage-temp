/**
 * Generates SVG illustrations for batch2 expanded about pages.
 * Run: node scripts/generate-about-illustrations.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { batch2Pages } from "./about-batch2-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "about-illustrations");

const C = {
  plum: "#381d2a",
  terracotta: "#ba5624",
  sage: "#c4d6b0",
  peach: "#ffa552",
  cream: "#fcde9c",
  white: "#ffffff",
};

/** @param {string} slug @param {string} title @param {string} desc */
function svgWrap(slug, title, desc, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="title-${slug} desc-${slug}">
  <title id="title-${slug}">${title}</title>
  <desc id="desc-${slug}">${desc}</desc>
  <rect width="640" height="360" fill="${C.cream}" rx="8"/>
  ${inner}
</svg>`;
}

/** @type {Record<string, (slug: string) => string>} */
const diagrams = {
  "humidity-condensation-basics": (slug) =>
    svgWrap(
      slug,
      "Humidity and condensation",
      "Warm humid air meets a cold slab and releases moisture",
      `<rect x="40" y="240" width="560" height="80" fill="${C.plum}" opacity="0.85"/>
  <text x="320" y="285" text-anchor="middle" fill="${C.cream}" font-family="system-ui,sans-serif" font-size="14">Cold concrete slab</text>
  <path d="M120 80 Q200 140 280 200 T440 220" stroke="${C.terracotta}" stroke-width="3" fill="none" marker-end="url(#arr)"/>
  <ellipse cx="180" cy="100" rx="70" ry="40" fill="${C.sage}" opacity="0.7"/>
  <text x="180" y="105" text-anchor="middle" fill="${C.plum}" font-size="13" font-family="system-ui">Humid air</text>
  <circle cx="400" cy="180" r="8" fill="${C.peach}"/>
  <circle cx="420" cy="200" r="6" fill="${C.peach}"/>
  <circle cx="380" cy="210" r="7" fill="${C.peach}"/>
  <text x="480" y="170" fill="${C.plum}" font-size="12" font-family="system-ui">Dew point</text>
  <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.terracotta}"/></marker></defs>`,
    ),

  "probe-cable-length-limits": (slug) =>
    svgWrap(
      slug,
      "Probe cable length",
      "Short clean run versus long noisy cable",
      `<rect x="60" y="160" width="80" height="50" rx="4" fill="${C.plum}"/>
  <text x="100" y="190" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">Arduino</text>
  <line x1="140" y1="185" x2="220" y2="185" stroke="${C.sage}" stroke-width="4"/>
  <rect x="220" y="170" width="40" height="30" rx="15" fill="${C.terracotta}"/>
  <text x="100" y="140" fill="${C.plum}" font-size="12" font-family="system-ui">Short OK</text>
  <rect x="340" y="160" width="80" height="50" rx="4" fill="${C.plum}"/>
  <path d="M420 185 H520" stroke="${C.peach}" stroke-width="4" stroke-dasharray="8 4"/>
  <text x="470" y="170" fill="${C.terracotta}" font-size="20" font-family="system-ui">⚡</text>
  <rect x="520" y="170" width="40" height="30" rx="15" fill="${C.terracotta}"/>
  <text x="470" y="140" fill="${C.plum}" font-size="12" font-family="system-ui">Long + noise</text>`,
    ),

  "thermal-mass-concrete-slab": (slug) =>
    svgWrap(
      slug,
      "Thermal mass slab",
      "Slab stores heat and lags air temperature",
      `<rect x="0" y="260" width="640" height="100" fill="${C.plum}"/>
  <text x="320" y="310" text-anchor="middle" fill="${C.cream}" font-size="13" font-family="system-ui">Concrete thermal mass</text>
  <path d="M80 220 L560 220" stroke="${C.terracotta}" stroke-width="2"/>
  <path d="M80 180 Q200 200 320 150 T560 120" stroke="${C.peach}" stroke-width="3" fill="none"/>
  <text x="90" y="175" fill="${C.plum}" font-size="12" font-family="system-ui">Air temp (fast)</text>
  <path d="M80 240 Q200 235 320 230 T560 225" stroke="${C.sage}" stroke-width="3" fill="none"/>
  <text x="90" y="250" fill="${C.plum}" font-size="12" font-family="system-ui">Slab influence (slow)</text>`,
    ),

  "hvac-duct-influence": (slug) =>
    svgWrap(
      slug,
      "HVAC duct influence",
      "Duct leak warms air near a probe",
      `<rect x="0" y="0" width="640" height="200" fill="${C.sage}" opacity="0.35"/>
  <rect x="200" y="40" width="240" height="40" rx="20" fill="${C.plum}"/>
  <text x="320" y="65" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">HVAC duct</text>
  <path d="M280 80 Q300 120 320 160" stroke="${C.peach}" stroke-width="3" fill="none" stroke-dasharray="6 3"/>
  <circle cx="320" cy="200" r="24" fill="${C.terracotta}"/>
  <text x="320" y="205" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">Probe</text>
  <text x="400" y="130" fill="${C.plum}" font-size="12" font-family="system-ui">Warm leak</text>`,
    ),

  "stored-vehicle-heat": (slug) =>
    svgWrap(
      slug,
      "Vehicle heat plume",
      "Parked car radiates heat toward nearby probe",
      `<rect x="120" y="200" width="200" height="80" rx="12" fill="${C.plum}"/>
  <rect x="140" y="180" width="160" height="40" rx="8" fill="${C.terracotta}"/>
  <text x="220" y="250" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">Vehicle</text>
  <path d="M220 160 Q220 100 280 80 Q340 60 380 90" stroke="${C.peach}" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M240 150 Q260 110 300 95" stroke="${C.peach}" stroke-width="2" fill="none" opacity="0.5"/>
  <circle cx="480" cy="120" r="20" fill="${C.sage}" stroke="${C.plum}" stroke-width="2"/>
  <text x="480" y="125" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">Probe</text>`,
    ),

  "spotting-data-gaps": (slug) =>
    svgWrap(
      slug,
      "Data gaps in charts",
      "Gap versus flat line in time series",
      `<line x1="60" y1="280" x2="580" y2="280" stroke="${C.plum}" stroke-width="2"/>
  <polyline points="60,220 140,200 220,210 300,190" fill="none" stroke="${C.terracotta}" stroke-width="3"/>
  <text x="340" y="200" fill="${C.plum}" font-size="24" font-family="system-ui">···</text>
  <polyline points="420,180 500,170 580,160" fill="none" stroke="${C.terracotta}" stroke-width="3"/>
  <line x1="60" y1="100" x2="580" y2="100" stroke="${C.sage}" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="70" y="90" fill="${C.plum}" font-size="12" font-family="system-ui">Flat (valid)</text>
  <text x="330" y="240" fill="${C.terracotta}" font-size="12" font-family="system-ui">Gap (missing)</text>`,
    ),

  "charting-with-spreadsheets": (slug) =>
    svgWrap(
      slug,
      "Spreadsheet charting",
      "CSV columns drive a line chart",
      `<rect x="60" y="60" width="220" height="240" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <line x1="80" y1="90" x2="260" y2="90" stroke="${C.sage}"/>
  <line x1="80" y1="120" x2="260" y2="120" stroke="${C.sage}"/>
  <line x1="80" y1="150" x2="260" y2="150" stroke="${C.sage}"/>
  <text x="70" y="85" fill="${C.plum}" font-size="10" font-family="monospace">timestamp</text>
  <rect x="320" y="80" width="260" height="200" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <polyline points="340,240 400,180 460,200 520,120 560,140" fill="none" stroke="${C.terracotta}" stroke-width="3"/>
  <text x="400" y="70" text-anchor="middle" fill="${C.plum}" font-size="13" font-family="system-ui">Line chart</text>`,
    ),

  "serial-debugging-tips": (slug) =>
    svgWrap(
      slug,
      "Serial debugging",
      "Laptop serial monitor connected to Arduino",
      `<rect x="80" y="120" width="100" height="70" rx="4" fill="${C.plum}"/>
  <text x="130" y="160" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">Uno</text>
  <rect x="280" y="80" width="280" height="200" rx="6" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <text x="300" y="110" fill="${C.plum}" font-size="11" font-family="monospace">DHT OK p0</text>
  <text x="300" y="135" fill="${C.plum}" font-size="11" font-family="monospace">IP 192.168.1.50</text>
  <text x="300" y="160" fill="${C.terracotta}" font-size="11" font-family="monospace">HTTP 200</text>
  <line x1="180" y1="155" x2="280" y2="155" stroke="${C.sage}" stroke-width="3"/>
  <text x="420" y="250" fill="${C.plum}" font-size="12" font-family="system-ui">Serial monitor</text>`,
    ),

  "library-dependencies": (slug) =>
    svgWrap(
      slug,
      "Library dependencies",
      "Sketch depends on DHT LCD and Ethernet libs",
      `<rect x="240" y="140" width="160" height="80" rx="6" fill="${C.plum}"/>
  <text x="320" y="185" text-anchor="middle" fill="${C.cream}" font-size="13" font-family="system-ui">Sketch</text>
  <rect x="80" y="60" width="120" height="50" rx="4" fill="${C.sage}"/>
  <text x="140" y="90" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">DHT lib</text>
  <rect x="440" y="60" width="120" height="50" rx="4" fill="${C.sage}"/>
  <text x="500" y="90" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">LCD lib</text>
  <rect x="260" y="260" width="120" height="50" rx="4" fill="${C.sage}"/>
  <text x="320" y="290" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Ethernet</text>
  <line x1="200" y1="110" x2="280" y2="150" stroke="${C.terracotta}" stroke-width="2"/>
  <line x1="440" y1="110" x2="360" y2="150" stroke="${C.terracotta}" stroke-width="2"/>
  <line x1="320" y1="220" x2="320" y2="260" stroke="${C.terracotta}" stroke-width="2"/>`,
    ),

  "static-ip-vs-dhcp": (slug) =>
    svgWrap(
      slug,
      "Static IP vs DHCP",
      "Router assigns stable IP to Arduino MAC",
      `<rect x="260" y="100" width="120" height="80" rx="6" fill="${C.plum}"/>
  <text x="320" y="145" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">Router</text>
  <rect x="80" y="220" width="100" height="60" rx="4" fill="${C.terracotta}"/>
  <text x="130" y="255" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">Arduino</text>
  <text x="130" y="200" fill="${C.plum}" font-size="10" font-family="monospace">MAC → .50</text>
  <rect x="460" y="220" width="100" height="60" rx="4" fill="${C.peach}" opacity="0.8"/>
  <text x="510" y="250" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">DHCP pool</text>
  <line x1="180" y1="250" x2="260" y2="160" stroke="${C.sage}" stroke-width="2"/>
  <line x1="440" y1="250" x2="380" y2="160" stroke="${C.sage}" stroke-width="2" stroke-dasharray="6 3"/>`,
    ),

  "ground-loop-avoidance": (slug) =>
    svgWrap(
      slug,
      "Ground star wiring",
      "Single ground reference at Arduino",
      `<circle cx="320" cy="200" r="40" fill="${C.plum}"/>
  <text x="320" y="205" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">GND ★</text>
  <line x1="320" y1="200" x2="120" y2="100" stroke="${C.sage}" stroke-width="3"/>
  <line x1="320" y1="200" x2="520" y2="100" stroke="${C.sage}" stroke-width="3"/>
  <line x1="320" y1="200" x2="120" y2="300" stroke="${C.sage}" stroke-width="3"/>
  <line x1="320" y1="200" x2="520" y2="300" stroke="${C.sage}" stroke-width="3"/>
  <text x="320" y="60" text-anchor="middle" fill="${C.plum}" font-size="13" font-family="system-ui">Star ground (good)</text>
  <path d="M80 320 H200 H120 H240" stroke="${C.terracotta}" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
  <text x="160" y="345" fill="${C.terracotta}" font-size="11" font-family="system-ui">Loop (bad)</text>`,
    ),

  "enclosure-ventilation": (slug) =>
    svgWrap(
      slug,
      "Enclosure ventilation",
      "Ventilated probe box and louvered MCU enclosure",
      `<rect x="80" y="100" width="180" height="160" rx="8" fill="${C.sage}" stroke="${C.plum}" stroke-width="2"/>
  <line x1="100" y1="120" x2="100" y2="240" stroke="${C.plum}" stroke-width="2"/>
  <line x1="130" y1="120" x2="130" y2="240" stroke="${C.plum}" stroke-width="2"/>
  <circle cx="170" cy="180" r="20" fill="${C.terracotta}"/>
  <text x="170" y="280" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Probe box</text>
  <rect x="380" y="100" width="180" height="160" rx="8" fill="${C.peach}" opacity="0.5" stroke="${C.plum}" stroke-width="2"/>
  <path d="M400 130 H540 M400 160 H540 M400 190 H540" stroke="${C.plum}" stroke-width="2"/>
  <path d="M520 100 L540 80 M520 260 L540 280" stroke="${C.terracotta}" stroke-width="2" marker-end="url(#arr2)"/>
  <text x="470" y="280" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">MCU exhaust</text>
  <defs><marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.terracotta}"/></marker></defs>`,
    ),

  "backlight-pwm-options": (slug) =>
    svgWrap(
      slug,
      "LCD backlight PWM",
      "Transistor switches backlight LED",
      `<rect x="100" y="100" width="200" height="120" rx="4" fill="${C.plum}"/>
  <text x="200" y="170" text-anchor="middle" fill="${C.cream}" font-size="14" font-family="system-ui">LCD</text>
  <rect x="380" y="140" width="60" height="40" fill="${C.terracotta}"/>
  <text x="410" y="165" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">NPN</text>
  <circle cx="520" cy="160" r="30" fill="${C.peach}"/>
  <text x="520" y="165" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">LED</text>
  <line x1="300" y1="160" x2="380" y2="160" stroke="${C.sage}" stroke-width="2"/>
  <text x="60" y="160" fill="${C.plum}" font-size="11" font-family="system-ui">PWM pin</text>`,
    ),

  "jumper-wire-standards": (slug) =>
    svgWrap(
      slug,
      "Jumper wire colors",
      "Color-coded breadboard jumpers",
      `<rect x="200" y="80" width="240" height="200" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <line x1="240" y1="120" x2="400" y2="120" stroke="#cc0000" stroke-width="4"/>
  <text x="420" y="125" fill="${C.plum}" font-size="11" font-family="system-ui">5V red</text>
  <line x1="240" y1="160" x2="400" y2="160" stroke="#222" stroke-width="4"/>
  <text x="420" y="165" fill="${C.plum}" font-size="11" font-family="system-ui">GND black</text>
  <line x1="240" y1="200" x2="400" y2="200" stroke="${C.sage}" stroke-width="4"/>
  <text x="420" y="205" fill="${C.plum}" font-size="11" font-family="system-ui">Data</text>
  <line x1="240" y1="240" x2="400" y2="240" stroke="${C.peach}" stroke-width="4"/>
  <text x="420" y="245" fill="${C.plum}" font-size="11" font-family="system-ui">Data 2</text>`,
    ),

  "sensor-warm-up-time": (slug) =>
    svgWrap(
      slug,
      "Sensor warm-up",
      "Humidity settles after power-on",
      `<line x1="60" y1="280" x2="580" y2="280" stroke="${C.plum}" stroke-width="2"/>
  <path d="M60 200 L120 195 L180 190 L240 188" stroke="${C.peach}" stroke-width="3" fill="none"/>
  <text x="70" y="190" fill="${C.plum}" font-size="11" font-family="system-ui">Temp</text>
  <path d="M60 240 Q180 230 280 200 T560 170" stroke="${C.terracotta}" stroke-width="3" fill="none"/>
  <text x="70" y="250" fill="${C.plum}" font-size="11" font-family="system-ui">RH</text>
  <line x1="120" y1="60" x2="120" y2="280" stroke="${C.sage}" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="125" y="55" fill="${C.plum}" font-size="10" font-family="system-ui">Power on</text>`,
    ),

  "lcd-i2c-alternative": (slug) =>
    svgWrap(
      slug,
      "I2C LCD alternative",
      "Parallel vs I2C pin count",
      `<rect x="60" y="100" width="220" height="160" rx="6" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <text x="170" y="130" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">Parallel: 6+ pins</text>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${90 + i * 28}" y="160" width="16" height="40" fill="${C.terracotta}"/>`).join("\n  ")}
  <rect x="360" y="100" width="220" height="160" rx="6" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <text x="470" y="130" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">I²C: 2 wires</text>
  <line x1="400" y1="200" x2="540" y2="200" stroke="${C.sage}" stroke-width="4"/>
  <line x1="400" y1="230" x2="540" y2="230" stroke="${C.sage}" stroke-width="4"/>
  <text x="470" y="260" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">SDA / SCL</text>`,
    ),

  "docker-relay-deployment": (slug) =>
    svgWrap(
      slug,
      "Docker relay stack",
      "Compose services for relay Redis and proxy",
      `<rect x="200" y="60" width="240" height="70" rx="8" fill="${C.plum}"/>
  <text x="320" y="100" text-anchor="middle" fill="${C.cream}" font-size="13" font-family="system-ui">docker compose</text>
  <rect x="80" y="180" width="140" height="100" rx="6" fill="${C.sage}"/>
  <text x="150" y="235" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">FastAPI</text>
  <rect x="250" y="180" width="140" height="100" rx="6" fill="${C.peach}"/>
  <text x="320" y="235" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">Redis</text>
  <rect x="420" y="180" width="140" height="100" rx="6" fill="${C.terracotta}"/>
  <text x="490" y="235" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">TLS proxy</text>
  <line x1="320" y1="130" x2="150" y2="180" stroke="${C.plum}" stroke-width="2"/>
  <line x1="320" y1="130" x2="320" y2="180" stroke="${C.plum}" stroke-width="2"/>
  <line x1="320" y1="130" x2="490" y2="180" stroke="${C.plum}" stroke-width="2"/>`,
    ),

  "environment-variables-relay": (slug) =>
    svgWrap(
      slug,
      "Relay environment variables",
      "Env file configures relay at startup",
      `<rect x="80" y="80" width="200" height="200" rx="6" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <text x="100" y="110" fill="${C.plum}" font-size="11" font-family="monospace">UPSTREAM_URL=</text>
  <text x="100" y="140" fill="${C.plum}" font-size="11" font-family="monospace">REDIS_URL=</text>
  <text x="100" y="170" fill="${C.plum}" font-size="11" font-family="monospace">CACHE_TTL=</text>
  <path d="M280 180 H360" stroke="${C.terracotta}" stroke-width="3" marker-end="url(#arr3)"/>
  <rect x="360" y="130" width="200" height="100" rx="8" fill="${C.sage}"/>
  <text x="460" y="185" text-anchor="middle" fill="${C.plum}" font-size="13" font-family="system-ui">Relay process</text>
  <defs><marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.terracotta}"/></marker></defs>`,
    ),

  "health-check-endpoints": (slug) =>
    svgWrap(
      slug,
      "Health check endpoints",
      "Monitor probes relay Redis and upstream",
      `<circle cx="100" cy="180" r="40" fill="${C.peach}"/>
  <text x="100" y="185" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">Monitor</text>
  <rect x="220" y="140" width="120" height="80" rx="6" fill="${C.plum}"/>
  <text x="280" y="185" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">/health</text>
  <rect x="400" y="100" width="80" height="50" rx="4" fill="${C.sage}"/>
  <text x="440" y="130" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">Redis</text>
  <rect x="400" y="210" width="80" height="50" rx="4" fill="${C.terracotta}"/>
  <text x="440" y="240" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">Arduino</text>
  <line x1="340" y1="170" x2="400" y2="125" stroke="${C.plum}" stroke-width="2"/>
  <line x1="340" y1="190" x2="400" y2="235" stroke="${C.plum}" stroke-width="2"/>
  <line x1="140" y1="180" x2="220" y2="180" stroke="${C.terracotta}" stroke-width="2"/>`,
    ),

  "middleware-auth-patterns": (slug) =>
    svgWrap(
      slug,
      "Middleware auth",
      "Request passes auth gate before dashboard",
      `<rect x="60" y="150" width="100" height="60" rx="4" fill="${C.peach}"/>
  <text x="110" y="185" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Request</text>
  <rect x="220" y="130" width="140" height="100" rx="6" fill="${C.plum}"/>
  <text x="290" y="175" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">Middleware</text>
  <text x="290" y="195" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">auth check</text>
  <rect x="420" y="150" width="160" height="60" rx="4" fill="${C.sage}"/>
  <text x="500" y="185" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Dashboard SSR</text>
  <line x1="160" y1="180" x2="220" y2="180" stroke="${C.terracotta}" stroke-width="2"/>
  <line x1="360" y1="180" x2="420" y2="180" stroke="${C.terracotta}" stroke-width="2"/>
  <path d="M290 230 Q290 280 110 280" stroke="${C.terracotta}" stroke-width="2" fill="none" stroke-dasharray="5 3"/>
  <text x="180" y="300" fill="${C.terracotta}" font-size="10" font-family="system-ui">redirect if anon</text>`,
    ),

  "env-secrets-cloudflare": (slug) =>
    svgWrap(
      slug,
      "Cloudflare secrets",
      "Secrets inject at deploy not in client bundle",
      `<rect x="80" y="60" width="200" height="120" rx="6" fill="${C.plum}"/>
  <text x="180" y="110" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">CF Dashboard</text>
  <text x="180" y="130" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">Secrets</text>
  <rect x="360" y="60" width="200" height="120" rx="6" fill="${C.sage}"/>
  <text x="460" y="110" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">Worker runtime</text>
  <rect x="360" y="220" width="200" height="80" rx="6" fill="${C.peach}" opacity="0.7"/>
  <text x="460" y="265" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Browser (public only)</text>
  <path d="M280 120 H360" stroke="${C.terracotta}" stroke-width="2"/>
  <path d="M460 180 L460 220" stroke="${C.terracotta}" stroke-width="2" stroke-dasharray="4 3"/>`,
    ),

  "tailwind-v4-setup": (slug) =>
    svgWrap(
      slug,
      "Tailwind v4 in Astro",
      "CSS theme tokens flow to components",
      `<rect x="100" y="80" width="180" height="100" rx="6" fill="${C.plum}"/>
  <text x="190" y="130" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">@theme CSS</text>
  <rect x="360" y="60" width="180" height="70" rx="4" fill="${C.sage}"/>
  <text x="450" y="100" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Astro layout</text>
  <rect x="360" y="150" width="180" height="70" rx="4" fill="${C.peach}"/>
  <text x="450" y="190" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Components</text>
  <rect x="360" y="240" width="180" height="70" rx="4" fill="${C.terracotta}"/>
  <text x="450" y="280" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">Islands</text>
  <line x1="280" y1="130" x2="360" y2="95" stroke="${C.plum}" stroke-width="2"/>
  <line x1="280" y1="130" x2="360" y2="185" stroke="${C.plum}" stroke-width="2"/>
  <line x1="280" y1="130" x2="360" y2="275" stroke="${C.plum}" stroke-width="2"/>`,
    ),

  "websocket-live-updates": (slug) =>
    svgWrap(
      slug,
      "WebSocket live updates",
      "Server pushes probe JSON to browsers",
      `<rect x="80" y="140" width="120" height="80" rx="6" fill="${C.plum}"/>
  <text x="140" y="185" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">Node server</text>
  <rect x="440" y="100" width="120" height="60" rx="4" fill="${C.sage}"/>
  <rect x="440" y="200" width="120" height="60" rx="4" fill="${C.sage}"/>
  <text x="500" y="280" text-anchor="middle" fill="${C.plum}" font-size="11" font-family="system-ui">Browsers</text>
  <path d="M200 170 Q320 100 440 130" stroke="${C.terracotta}" stroke-width="2" fill="none"/>
  <path d="M200 190 Q320 260 440 230" stroke="${C.terracotta}" stroke-width="2" fill="none"/>
  <text x="310" y="90" fill="${C.plum}" font-size="11" font-family="system-ui">WebSocket push</text>`,
    ),

  "hosting-cost-comparison": (slug) =>
    svgWrap(
      slug,
      "Hosting cost comparison",
      "Relative monthly cost bars by stack",
      `<text x="80" y="70" fill="${C.plum}" font-size="12" font-family="system-ui">Edge Astro</text>
  <rect x="200" y="50" width="80" height="30" fill="${C.sage}"/>
  <text x="80" y="120" fill="${C.plum}" font-size="12" font-family="system-ui">VPS Node</text>
  <rect x="200" y="100" width="200" height="30" fill="${C.peach}"/>
  <text x="80" y="170" fill="${C.plum}" font-size="12" font-family="system-ui">Vercel Next</text>
  <rect x="200" y="150" width="160" height="30" fill="${C.terracotta}"/>
  <text x="80" y="220" fill="${C.plum}" font-size="12" font-family="system-ui">Home relay</text>
  <rect x="200" y="200" width="60" height="30" fill="${C.plum}"/>
  <text x="320" y="280" fill="${C.plum}" font-size="11" font-family="system-ui">Relative monthly cost →</text>`,
    ),

  "weather-api-parallel-path": (slug) =>
    svgWrap(
      slug,
      "Parallel weather fetch",
      "SSR fetches probes and weather concurrently",
      `<rect x="260" y="100" width="120" height="60" rx="6" fill="${C.plum}"/>
  <text x="320" y="135" text-anchor="middle" fill="${C.cream}" font-size="11" font-family="system-ui">Astro SSR</text>
  <rect x="80" y="220" width="140" height="60" rx="4" fill="${C.terracotta}"/>
  <text x="150" y="255" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">Probe JSON</text>
  <rect x="420" y="220" width="140" height="60" rx="4" fill="${C.sage}"/>
  <text x="490" y="255" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">Weather API</text>
  <line x1="290" y1="160" x2="150" y2="220" stroke="${C.peach}" stroke-width="2"/>
  <line x1="350" y1="160" x2="490" y2="220" stroke="${C.peach}" stroke-width="2"/>
  <text x="280" y="310" fill="${C.plum}" font-size="12" font-family="system-ui">Promise.allSettled</text>`,
    ),

  "cookie-session-lifecycle": (slug) =>
    svgWrap(
      slug,
      "Session cookie lifecycle",
      "Sign-in to cookie to SSR to history insert",
      `<rect x="60" y="160" width="90" height="50" rx="4" fill="${C.peach}"/>
  <text x="105" y="190" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">Sign-in</text>
  <rect x="190" y="160" width="90" height="50" rx="4" fill="${C.sage}"/>
  <text x="235" y="190" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">Cookie</text>
  <rect x="320" y="160" width="90" height="50" rx="4" fill="${C.plum}"/>
  <text x="365" y="190" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">SSR</text>
  <rect x="450" y="160" width="130" height="50" rx="4" fill="${C.terracotta}"/>
  <text x="515" y="190" text-anchor="middle" fill="${C.cream}" font-size="10" font-family="system-ui">History insert</text>
  ${[0, 1, 2].map((i) => {
    const x1 = 150 + i * 130;
    return `<line x1="${x1}" y1="185" x2="${x1 + 40}" y2="185" stroke="${C.plum}" stroke-width="2"/>`;
  }).join("\n  ")}`,
    ),

  "caching-feed-responses": (slug) =>
    svgWrap(
      slug,
      "Feed caching layers",
      "Cache stack from browser to Arduino",
      `<rect x="40" y="150" width="90" height="50" rx="4" fill="${C.peach}"/>
  <text x="85" y="180" text-anchor="middle" fill="${C.plum}" font-size="9" font-family="system-ui">Browser</text>
  <rect x="160" y="150" width="90" height="50" rx="4" fill="${C.sage}"/>
  <text x="205" y="180" text-anchor="middle" fill="${C.plum}" font-size="9" font-family="system-ui">Edge</text>
  <rect x="280" y="150" width="90" height="50" rx="4" fill="${C.plum}"/>
  <text x="325" y="180" text-anchor="middle" fill="${C.cream}" font-size="9" font-family="system-ui">Redis</text>
  <rect x="400" y="150" width="90" height="50" rx="4" fill="${C.terracotta}"/>
  <text x="445" y="180" text-anchor="middle" fill="${C.cream}" font-size="9" font-family="system-ui">Relay</text>
  <rect x="520" y="150" width="90" height="50" rx="4" fill="${C.peach}"/>
  <text x="565" y="180" text-anchor="middle" fill="${C.plum}" font-size="9" font-family="system-ui">Arduino</text>
  ${[0, 1, 2, 3].map((i) => {
    const x1 = 130 + i * 120;
    return `<line x1="${x1}" y1="175" x2="${x1 + 30}" y2="175" stroke="${C.plum}" stroke-width="2"/>`;
  }).join("\n  ")}
  <text x="320" y="120" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">TTL decreases →</text>`,
    ),

  "group-membership-model": (slug) =>
    svgWrap(
      slug,
      "Group membership",
      "User linked to member and admin groups",
      `<circle cx="320" cy="120" r="50" fill="${C.plum}"/>
  <text x="320" y="125" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">User</text>
  <rect x="100" y="220" width="140" height="70" rx="6" fill="${C.sage}"/>
  <text x="170" y="260" text-anchor="middle" fill="${C.plum}" font-size="12" font-family="system-ui">member</text>
  <rect x="400" y="220" width="140" height="70" rx="6" fill="${C.terracotta}"/>
  <text x="470" y="260" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">admin</text>
  <line x1="280" y1="160" x2="170" y2="220" stroke="${C.peach}" stroke-width="2"/>
  <line x1="360" y1="160" x2="470" y2="220" stroke="${C.peach}" stroke-width="2"/>
  <text x="170" y="310" fill="${C.plum}" font-size="10" font-family="system-ui">CSV export</text>
  <text x="470" y="310" fill="${C.plum}" font-size="10" font-family="system-ui">Admin queue</text>`,
    ),

  "contact-form-admin-review": (slug) =>
    svgWrap(
      slug,
      "Contact admin review",
      "Admin queue lists contact submissions",
      `<rect x="120" y="60" width="400" height="240" rx="8" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <rect x="140" y="80" width="360" height="36" fill="${C.plum}"/>
  <text x="320" y="103" text-anchor="middle" fill="${C.cream}" font-size="12" font-family="system-ui">Contact submissions</text>
  <line x1="140" y1="130" x2="500" y2="130" stroke="${C.sage}"/>
  <line x1="140" y1="170" x2="500" y2="170" stroke="${C.sage}"/>
  <line x1="140" y1="210" x2="500" y2="210" stroke="${C.sage}"/>
  <circle cx="470" cy="150" r="12" fill="${C.peach}"/>
  <text x="470" y="154" text-anchor="middle" fill="${C.plum}" font-size="10" font-family="system-ui">✓</text>`,
    ),

  "display-preferences-deep-dive": (slug) =>
    svgWrap(
      slug,
      "Display preferences",
      "Settings toggles for units and card order",
      `<rect x="140" y="60" width="360" height="240" rx="8" fill="${C.white}" stroke="${C.plum}" stroke-width="2"/>
  <text x="320" y="100" text-anchor="middle" fill="${C.plum}" font-size="14" font-family="system-ui">Display preferences</text>
  <rect x="180" y="120" width="60" height="30" rx="15" fill="${C.terracotta}"/>
  <rect x="250" y="125" width="30" height="20" rx="10" fill="${C.cream}"/>
  <text x="320" y="140" fill="${C.plum}" font-size="11" font-family="system-ui">°F / °C</text>
  <rect x="180" y="180" width="280" height="40" rx="4" fill="${C.sage}" opacity="0.5"/>
  <text x="200" y="205" fill="${C.plum}" font-size="11" font-family="system-ui">Feed order ⋮⋮</text>
  <rect x="180" y="240" width="280" height="40" rx="4" fill="${C.peach}" opacity="0.4"/>
  <text x="200" y="265" fill="${C.plum}" font-size="11" font-family="system-ui">Show humidity</text>`,
    ),
};

mkdirSync(outDir, { recursive: true });

let written = 0;
for (const page of batch2Pages) {
  const fn = diagrams[page.slug];
  if (!fn) {
    throw new Error(`Missing diagram generator for slug: ${page.slug}`);
  }
  const path = join(outDir, `${page.slug}.svg`);
  writeFileSync(path, fn(page.slug), "utf8");
  written++;
}

console.log(`Wrote ${written} SVG illustrations to ${outDir}`);
