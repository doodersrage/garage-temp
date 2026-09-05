import { describe, expect, it } from "vitest";
import {
  buildArduinoEthernetDefinesSnippet,
  buildArduinoHttpClientSnippet,
  buildPersonalizedDs18b20Circuitpython,
  buildPersonalizedDs18b20Ino,
  buildPersonalizedDs18b20Micropython,
  buildPersonalizedDs18b20ZephyrC,
  buildPersonalizedDs18b20Ch32vC,
  buildPersonalizedDs18b20AvrS,
  buildPersonalizedDs18b20Pic18C,
  buildPersonalizedDs18b20TeensyIno,
  buildPersonalizedDs18b20ParticleIno,
  buildPersonalizedParticleWebhookJson,
  buildPersonalizedEspHomeYaml,
  buildZephyrEthernetDefinesSnippet,
  buildCh32vEthernetDefinesSnippet,
  buildAvrAsmEthernetDefinesSnippet,
  buildPic18EthernetDefinesSnippet,
  buildTeensyEthernetDefinesSnippet,
  buildParticleCellularSnippet,
  firmwareDownloadHref,
  parseIngestUrlParts,
} from "./firmwareSketches";

describe("firmwareSketches", () => {
  const url = "https://thermaltrace.dev/api/ingest/abc123key";

  it("parses ingest URL host and path", () => {
    expect(parseIngestUrlParts(url)).toEqual({
      host: "thermaltrace.dev",
      path: "/api/ingest/abc123key",
      origin: "https://thermaltrace.dev",
    });
  });

  it("builds Arduino snippet with real path and host", () => {
    const snippet = buildArduinoHttpClientSnippet(url, [
      { key: "temp1", kind: "temperature" },
    ]);
    expect(snippet).toContain("POST /api/ingest/abc123key HTTP/1.1");
    expect(snippet).toContain("Host: thermaltrace.dev");
    expect(snippet).not.toContain("YOUR_KEY");
  });

  it("personalizes DS18B20 Arduino sketch with ingest URL", () => {
    const ino = buildPersonalizedDs18b20Ino(url);
    expect(ino).toContain(`#define INGEST_URL "${url}"`);
    expect(ino).toContain("ONE_WIRE_PIN 4");
    expect(ino).toContain("115200");
    expect(ino).toContain("your-wifi");
    expect(ino).toContain("ARDUINO_ARCH_RP2040");
  });

  it("personalizes MicroPython sketch with ingest URL", () => {
    const py = buildPersonalizedDs18b20Micropython(url);
    expect(py).toContain(`INGEST_URL = "${url}"`);
    expect(py).toContain("ONE_WIRE_PIN = 4");
    expect(py).toContain("Pico W");
  });

  it("personalizes CircuitPython sketch with ingest URL", () => {
    const py = buildPersonalizedDs18b20Circuitpython(url);
    expect(py).toContain(`INGEST_URL = "${url}"`);
    expect(py).toContain("adafruit_ds18x20");
    expect(py).toContain("GP4");
    expect(py).toContain("code.py");
  });

  it("personalizes ESPHome yaml with ingest URL", () => {
    const yaml = buildPersonalizedEspHomeYaml(url);
    expect(yaml).toContain(`url: ${url}`);
    expect(yaml).toContain("http_request.post");
  });

  it("personalizes Zephyr STM32 sketch with ingest path", () => {
    const c = buildPersonalizedDs18b20ZephyrC(url);
    expect(c).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(c).toContain("nucleo_f767zi");
    expect(c).toContain("maxim_ds18b20");
    expect(c).toContain("PF14");
  });

  it("builds Uno Ethernet defines with the real ingest path", () => {
    const snippet = buildArduinoEthernetDefinesSnippet(url);
    expect(snippet).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(snippet).toContain("ethernet_dht22_ingest");
    expect(snippet).toContain("192.168.1.50");
  });

  it("builds Zephyr Ethernet defines with the real ingest path", () => {
    const snippet = buildZephyrEthernetDefinesSnippet(url);
    expect(snippet).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(snippet).toContain("ds18b20_ingest");
    expect(snippet).toContain("nucleo_f767zi");
  });

  it("personalizes CH32V WCHNET sketch with ingest path", () => {
    const c = buildPersonalizedDs18b20Ch32vC(url);
    expect(c).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(c).not.toContain("YOUR_DEVICE_KEY");
    expect(c).toContain("CH32V307");
    expect(c).toContain("PB12");
    expect(c).toContain("WCHNET");
  });

  it("builds CH32V Ethernet defines with the real ingest path", () => {
    const snippet = buildCh32vEthernetDefinesSnippet(url);
    expect(snippet).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(snippet).toContain("ch32v307_ds18b20_ingest");
    expect(snippet).toContain("PB12");
  });

  it("personalizes AVR assembly sketch with ingest path", () => {
    const s = buildPersonalizedDs18b20AvrS(url);
    expect(s).toContain('.asciz	"/api/ingest/abc123key"');
    expect(s).not.toContain("YOUR_DEVICE_KEY");
    expect(s).toContain("W5100");
    expect(s).toContain("OW_BIT");
    expect(s).toContain("ATmega328P");
  });

  it("builds AVR assembly Ethernet defines with the real ingest path", () => {
    const snippet = buildAvrAsmEthernetDefinesSnippet(url);
    expect(snippet).toContain('.asciz	"/api/ingest/abc123key"');
    expect(snippet).toContain("atmega328_w5100_ds18b20");
    expect(snippet).toContain("D7");
  });

  it("personalizes Teensy 4.1 sketch with ingest path", () => {
    const ino = buildPersonalizedDs18b20TeensyIno(url);
    expect(ino).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(ino).not.toContain("YOUR_DEVICE_KEY");
    expect(ino).toContain("QNEthernet");
    expect(ino).toContain("ONE_WIRE_PIN 4");
  });

  it("builds Teensy Ethernet defines with the real ingest path", () => {
    const snippet = buildTeensyEthernetDefinesSnippet(url);
    expect(snippet).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(snippet).toContain("teensy41_ds18b20_ingest");
  });

  it("personalizes PIC18 sketch with ingest path", () => {
    const c = buildPersonalizedDs18b20Pic18C(url);
    expect(c).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(c).not.toContain("YOUR_DEVICE_KEY");
    expect(c).toContain("PIC18F67J60");
    expect(c).toContain("ThermalTraceAppTask");
  });

  it("builds PIC18 Ethernet defines with the real ingest path", () => {
    const snippet = buildPic18EthernetDefinesSnippet(url);
    expect(snippet).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(snippet).toContain("pic18f67j60_ds18b20_ingest");
  });

  it("personalizes Particle Boron sketch and webhook with ingest URL", () => {
    const ino = buildPersonalizedDs18b20ParticleIno(url);
    expect(ino).toContain(`#define INGEST_URL "${url}"`);
    expect(ino).not.toContain("YOUR_DEVICE_KEY");
    expect(ino).toContain("thermaltrace_ingest");
    const webhook = buildPersonalizedParticleWebhookJson(url);
    expect(webhook).toContain(`"url": "${url}"`);
    expect(webhook).not.toContain("YOUR_DEVICE_KEY");
  });

  it("builds Particle cellular snippet with ingest URL", () => {
    const snippet = buildParticleCellularSnippet(url);
    expect(snippet).toContain(url);
    expect(snippet).toContain("boron_ds18b20_ingest");
  });

  it("builds a data URL for downloads", () => {
    const href = firmwareDownloadHref("hello");
    expect(href.startsWith("data:text/plain;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(href.split(",")[1]!)).toBe("hello");
  });
});
