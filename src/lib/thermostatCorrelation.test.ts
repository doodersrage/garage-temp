import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("fetchNestSnapshot", () => {
  it("converts celsius traits to Fahrenheit", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "nest-project-uuid");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          devices: [
            {
              type: "sdm.devices.types.THERMOSTAT",
              traits: {
                "sdm.devices.traits.Temperature": { ambientTemperatureCelsius: 20 },
                "sdm.devices.traits.ThermostatTemperatureSetpoint": { heatCelsius: 0 },
                "sdm.devices.traits.ThermostatMode": { mode: "HEAT" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchNestSnapshot } = await import("./thermostatCorrelation");
    const snapshot = await fetchNestSnapshot("token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://smartdevicemanagement.googleapis.com/v1/enterprises/nest-project-uuid/devices",
      expect.any(Object),
    );
    expect(snapshot?.ambientTempF).toBeCloseTo(68, 0);
    expect(snapshot?.heatSetpointF).toBe(32);
    expect(snapshot?.hvacMode).toBe("HEAT");
  });

  it("prefers a thermostat device when multiple devices are returned", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "nest-project-uuid");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            devices: [
              {
                type: "sdm.devices.types.CAMERA",
                traits: {
                  "sdm.devices.traits.Temperature": { ambientTemperatureCelsius: 5 },
                },
              },
              {
                type: "sdm.devices.types.THERMOSTAT",
                traits: {
                  "sdm.devices.traits.Temperature": { ambientTemperatureCelsius: 21 },
                  "sdm.devices.traits.ThermostatMode": { mode: "COOL" },
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const { fetchNestSnapshot } = await import("./thermostatCorrelation");
    const snapshot = await fetchNestSnapshot("token");
    expect(snapshot?.ambientTempF).toBeCloseTo(69.8, 0);
    expect(snapshot?.hvacMode).toBe("COOL");
  });

  it("returns null when NEST_PROJECT_ID is not configured", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { fetchNestSnapshot } = await import("./thermostatCorrelation");
    expect(await fetchNestSnapshot("token")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null on a non-ok response", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "nest-project-uuid");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    const { fetchNestSnapshot } = await import("./thermostatCorrelation");
    expect(await fetchNestSnapshot("token")).toBeNull();
  });

  it("detects SDM API disabled errors", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "nest-project-uuid");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 403,
              message:
                "Smart Device Management API has not been used in project 179390663229 before or it is disabled.",
              status: "PERMISSION_DENIED",
              details: [{ reason: "SERVICE_DISABLED" }],
            },
          }),
          { status: 403 },
        ),
      ),
    );
    const { fetchNestSnapshotDetailed } = await import("./thermostatCorrelation");
    const result = await fetchNestSnapshotDetailed("token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("sdm_api_disabled");
      expect(result.activationUrl).toContain("179390663229");
    }
  });
});

describe("fetchEcobeeSnapshot", () => {
  it("converts tenths-of-a-degree readings to whole Fahrenheit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            thermostatList: [
              {
                runtime: { actualTemperature: 680, desiredHeat: 700 },
                settings: { hvacMode: "heat" },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const { fetchEcobeeSnapshot } = await import("./thermostatCorrelation");
    const snapshot = await fetchEcobeeSnapshot("token");
    expect(snapshot?.ambientTempF).toBe(68);
    expect(snapshot?.heatSetpointF).toBe(70);
    expect(snapshot?.hvacMode).toBe("heat");
  });
});

describe("fetchThermostatContext", () => {
  it("returns null without ever calling the provider when there's no access token", async () => {
    vi.doMock("./thermostatOAuth", () => ({
      resolveAccessTokenForHousehold: vi.fn().mockResolvedValue(null),
      forceRefreshAccessTokenForHousehold: vi.fn(),
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { fetchThermostatContext } = await import("./thermostatCorrelation");
    const result = await fetchThermostatContext("house-1", "ecobee");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries Nest fetch after forcing token refresh on 401", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "nest-project-uuid");
    const forceRefresh = vi.fn().mockResolvedValue("fresh-token");
    vi.doMock("./thermostatOAuth", () => ({
      resolveAccessTokenForHousehold: vi.fn().mockResolvedValue("stale-token"),
      forceRefreshAccessTokenForHousehold: forceRefresh,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            devices: [
              {
                type: "sdm.devices.types.THERMOSTAT",
                traits: {
                  "sdm.devices.traits.Temperature": { ambientTemperatureCelsius: 22 },
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchThermostatContext } = await import("./thermostatCorrelation");
    const snapshot = await fetchThermostatContext("house-1", "nest");
    expect(forceRefresh).toHaveBeenCalledWith("house-1", "nest");
    expect(snapshot?.ambientTempF).toBeCloseTo(71.6, 0);
  });

  it("returns SDM API disabled hint when Nest returns SERVICE_DISABLED", async () => {
    vi.stubEnv("NEST_PROJECT_ID", "nest-project-uuid");
    vi.doMock("./thermostatOAuth", () => ({
      resolveAccessTokenForHousehold: vi.fn().mockResolvedValue("token"),
      forceRefreshAccessTokenForHousehold: vi.fn(),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message:
                "Smart Device Management API has not been used in project 179390663229 before or it is disabled.",
              details: [{ reason: "SERVICE_DISABLED" }],
            },
          }),
          { status: 403 },
        ),
      ),
    );
    const { fetchThermostatContextWithStatus } = await import("./thermostatCorrelation");
    const result = await fetchThermostatContextWithStatus("house-1", "nest");
    expect(result.snapshot).toBeNull();
    expect(result.fetchError).toBe("sdm_api_disabled");
    expect(result.fetchHint).toContain("179390663229");
  });
});

describe("buildThermostatAnnotation", () => {
  it("returns null when there's no snapshot", async () => {
    const { buildThermostatAnnotation } = await import("./thermostatCorrelation");
    expect(buildThermostatAnnotation(null)).toBeNull();
  });

  it("describes an actively-heating thermostat", async () => {
    const { buildThermostatAnnotation } = await import("./thermostatCorrelation");
    const text = buildThermostatAnnotation({
      provider: "ecobee",
      ambientTempF: 68,
      heatSetpointF: 70,
      hvacMode: "heat",
    });
    expect(text).toContain("68°F");
    expect(text).toContain("set to 70°F");
    expect(text).toContain("actively heating");
    expect(text).not.toContain("not actively heating");
  });

  it("describes a thermostat that isn't heating", async () => {
    const { buildThermostatAnnotation } = await import("./thermostatCorrelation");
    const text = buildThermostatAnnotation({
      provider: "nest",
      ambientTempF: 65,
      heatSetpointF: null,
      hvacMode: "OFF",
    });
    expect(text).toContain("not actively heating");
  });
});
