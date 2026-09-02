import { describe, expect, it } from "vitest";
import {
  buildArduinoEthernetDefinesSnippet,
  buildArduinoHttpClientSnippet,
  buildPersonalizedDs18b20Ino,
  buildPersonalizedDs18b20Micropython,
  buildPersonalizedEspHomeYaml,
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
  });

  it("personalizes MicroPython sketch with ingest URL", () => {
    const py = buildPersonalizedDs18b20Micropython(url);
    expect(py).toContain(`INGEST_URL = "${url}"`);
    expect(py).toContain("ONE_WIRE_PIN = 4");
  });

  it("personalizes ESPHome yaml with ingest URL", () => {
    const yaml = buildPersonalizedEspHomeYaml(url);
    expect(yaml).toContain(`url: ${url}`);
    expect(yaml).toContain("http_request.post");
  });

  it("builds Uno Ethernet defines with the real ingest path", () => {
    const snippet = buildArduinoEthernetDefinesSnippet(url);
    expect(snippet).toContain('#define INGEST_PATH "/api/ingest/abc123key"');
    expect(snippet).toContain("ethernet_dht22_ingest");
    expect(snippet).toContain("192.168.1.50");
  });

  it("builds a data URL for downloads", () => {
    const href = firmwareDownloadHref("hello");
    expect(href.startsWith("data:text/plain;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(href.split(",")[1]!)).toBe("hello");
  });
});
