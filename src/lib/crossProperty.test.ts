import { beforeEach, describe, expect, it, vi } from "vitest";

function mockQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "gte", "order", "limit"]) {
    builder[method] = vi.fn(() => builder);
  }
  (builder as { then: unknown }).then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const mockFrom = vi.fn();
vi.mock("./supabase", () => ({
  createServerClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

const mockListUserHouseholds = vi.fn();
vi.mock("./households", () => ({
  listUserHouseholds: (...args: unknown[]) => mockListUserHouseholds(...args),
}));

const mockGetAlertSettingsForUser = vi.fn();
vi.mock("./notify", () => ({
  getAlertSettingsForUser: (...args: unknown[]) => mockGetAlertSettingsForUser(...args),
}));

beforeEach(() => {
  mockFrom.mockReset();
  mockListUserHouseholds.mockReset();
  mockGetAlertSettingsForUser.mockReset();
  mockGetAlertSettingsForUser.mockResolvedValue({ freezeThresholdF: 34 });
});

function tableRouter(byTable: Record<string, { data?: unknown; error?: unknown }>) {
  return (table: string) => mockQuery(byTable[table] ?? { data: [], error: null });
}

describe("fetchCrossPropertySnapshots", () => {
  it("returns an empty list without querying supabase when the user owns no households", async () => {
    mockListUserHouseholds.mockResolvedValue({ households: [], error: null });
    const { fetchCrossPropertySnapshots } = await import("./crossProperty");
    const result = await fetchCrossPropertySnapshots("user-1");
    expect(result).toEqual({ properties: [], error: null });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("propagates a household-listing error without querying further", async () => {
    mockListUserHouseholds.mockResolvedValue({ households: [], error: "boom" });
    const { fetchCrossPropertySnapshots } = await import("./crossProperty");
    const result = await fetchCrossPropertySnapshots("user-1");
    expect(result).toEqual({ properties: [], error: "boom" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("batches devices/sensors/readings across households in a fixed number of queries", async () => {
    mockListUserHouseholds.mockResolvedValue({
      households: [
        { household_id: "house-1", role: "owner", name: "Cabin" },
        { household_id: "house-2", role: "owner", name: "Rental A" },
        { household_id: "house-3", role: "owner", name: "Rental B" },
      ],
      error: null,
    });

    mockFrom.mockImplementation(
      tableRouter({
        devices: {
          data: [
            { id: "dev-1", household_id: "house-1" },
            { id: "dev-2", household_id: "house-2" },
            // house-3 has no devices at all.
          ],
          error: null,
        },
        device_sensors: {
          data: [
            { id: "sensor-1", device_id: "dev-1" },
            { id: "sensor-2", device_id: "dev-2" },
          ],
          error: null,
        },
        sensor_readings: {
          // Pre-sorted by recorded_at desc, as the real query would return.
          data: [
            { household_id: "house-2", value_num: 40, recorded_at: "2026-08-31T12:00:00.000Z" },
            { household_id: "house-1", value_num: 30, recorded_at: "2026-08-31T11:55:00.000Z" },
            { household_id: "house-1", value_num: 25, recorded_at: "2026-08-31T11:50:00.000Z" },
            { household_id: "house-2", value_num: 38, recorded_at: "2026-08-31T11:45:00.000Z" },
          ],
          error: null,
        },
      }),
    );

    const { fetchCrossPropertySnapshots } = await import("./crossProperty");
    const result = await fetchCrossPropertySnapshots("user-1");

    // Exactly 3 bulk queries regardless of household count -- devices,
    // device_sensors, sensor_readings -- not up to 3 per household.
    expect(mockFrom).toHaveBeenCalledTimes(3);
    expect(mockFrom).toHaveBeenCalledWith("devices");
    expect(mockFrom).toHaveBeenCalledWith("device_sensors");
    expect(mockFrom).toHaveBeenCalledWith("sensor_readings");

    expect(result.error).toBeNull();
    const byId = new Map(result.properties.map((p) => [p.householdId, p]));

    const house1 = byId.get("house-1")!;
    expect(house1.deviceCount).toBe(1);
    expect(house1.minTempF).toBe(25);
    expect(house1.lastReadingAt).toBe("2026-08-31T11:55:00.000Z");
    expect(house1.atRisk).toBe(true); // 25 <= 34 threshold
    expect(house1.freezeThresholdF).toBe(34);

    const house2 = byId.get("house-2")!;
    expect(house2.deviceCount).toBe(1);
    expect(house2.minTempF).toBe(38);
    expect(house2.lastReadingAt).toBe("2026-08-31T12:00:00.000Z");
    expect(house2.atRisk).toBe(false);

    const house3 = byId.get("house-3")!;
    expect(house3.deviceCount).toBe(0);
    expect(house3.minTempF).toBeNull();
    expect(house3.lastReadingAt).toBeNull();
    expect(house3.atRisk).toBe(false);
  });

  it("flags a property at risk when its minimum reading is at or below the freeze threshold", async () => {
    mockGetAlertSettingsForUser.mockResolvedValue({ freezeThresholdF: 34 });
    mockListUserHouseholds.mockResolvedValue({
      households: [{ household_id: "house-1", role: "owner", name: "Cabin" }],
      error: null,
    });
    mockFrom.mockImplementation(
      tableRouter({
        devices: { data: [{ id: "dev-1", household_id: "house-1" }], error: null },
        device_sensors: { data: [{ id: "sensor-1", device_id: "dev-1" }], error: null },
        sensor_readings: {
          data: [{ household_id: "house-1", value_num: 31, recorded_at: "2026-08-31T12:00:00.000Z" }],
          error: null,
        },
      }),
    );

    const { fetchCrossPropertySnapshots } = await import("./crossProperty");
    const result = await fetchCrossPropertySnapshots("user-1");
    expect(result.properties[0].minTempF).toBe(31);
    expect(result.properties[0].atRisk).toBe(true);
  });

  it("skips the sensor/reading queries entirely when no household has any devices", async () => {
    mockListUserHouseholds.mockResolvedValue({
      households: [{ household_id: "house-1", role: "owner", name: "Cabin" }],
      error: null,
    });
    mockFrom.mockImplementation(tableRouter({ devices: { data: [], error: null } }));

    const { fetchCrossPropertySnapshots } = await import("./crossProperty");
    const result = await fetchCrossPropertySnapshots("user-1");

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("devices");
    expect(result.properties[0]).toMatchObject({
      deviceCount: 0,
      minTempF: null,
      atRisk: false,
    });
  });
});
