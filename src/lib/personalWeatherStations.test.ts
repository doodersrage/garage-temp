import { describe, expect, it } from "vitest";
import {
  isWeatherLocationConfigured,
  normalizeAmbientMac,
  normalizeWeatherflowStationId,
  personalWeatherConfigFromMetadata,
} from "./personalWeatherStations";

describe("personalWeatherStations", () => {
  it("normalizes Ambient MAC addresses", () => {
    expect(normalizeAmbientMac("aa:bb:cc:dd:ee:ff")).toBe("AA:BB:CC:DD:EE:FF");
    expect(normalizeAmbientMac("not-a-mac")).toBeNull();
  });

  it("normalizes WeatherFlow station ids", () => {
    expect(normalizeWeatherflowStationId(" 12345 ")).toBe("12345");
    expect(normalizeWeatherflowStationId("abc")).toBeNull();
  });

  it("reads weather source from user metadata", () => {
    const config = personalWeatherConfigFromMetadata(
      {
        weather_source: "ambient",
        ambient_weather_mac: "AA:BB:CC:DD:EE:FF",
        ambient_weather_api_key: "secret",
      },
      "5128581",
    );
    expect(config.source).toBe("ambient");
    expect(config.ambientMac).toBe("AA:BB:CC:DD:EE:FF");
    expect(config.openWeatherCityId).toBe("5128581");
  });

  it("detects configured weather locations by source", () => {
    expect(
      isWeatherLocationConfigured({
        source: "openweather",
        openWeatherCityId: "5128581",
        ambientMac: null,
        ambientApiKey: null,
        weatherflowStationId: null,
        weatherflowToken: null,
      }),
    ).toBe(true);
    expect(
      isWeatherLocationConfigured({
        source: "ambient",
        openWeatherCityId: null,
        ambientMac: "AA:BB:CC:DD:EE:FF",
        ambientApiKey: "key",
        weatherflowStationId: null,
        weatherflowToken: null,
      }),
    ).toBe(true);
    expect(
      isWeatherLocationConfigured({
        source: "weatherflow",
        openWeatherCityId: null,
        ambientMac: null,
        ambientApiKey: null,
        weatherflowStationId: "99",
        weatherflowToken: null,
      }),
    ).toBe(false);
  });
});
