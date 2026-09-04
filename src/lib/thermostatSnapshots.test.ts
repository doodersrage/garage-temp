import { describe, expect, it } from "vitest";
import { isTransientThermostatCollectError } from "./thermostatSnapshots";

describe("isTransientThermostatCollectError", () => {
  it("soft-skips Nest/Ecobee network blips", () => {
    expect(isTransientThermostatCollectError("network")).toBe(true);
  });

  it("still fails hard on auth and config errors", () => {
    expect(isTransientThermostatCollectError("api_auth")).toBe(false);
    expect(isTransientThermostatCollectError("no_token")).toBe(false);
    expect(isTransientThermostatCollectError("sdm_api_disabled")).toBe(false);
    expect(isTransientThermostatCollectError("api_error")).toBe(false);
    expect(isTransientThermostatCollectError(null)).toBe(false);
  });
});
