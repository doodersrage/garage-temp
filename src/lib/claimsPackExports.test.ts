import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClaimsPackData } from "./claimsPack";

const mockFrom = vi.fn();
vi.mock("./supabase", () => ({
  createServerClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

beforeEach(() => {
  mockFrom.mockReset();
});

const basePack: ClaimsPackData = {
  exportedAt: "2026-08-31T00:00:00.000Z",
  householdLabel: "Test Household",
  rangeFrom: "2026-08-01T00:00:00.000Z",
  rangeTo: "2026-08-31T00:00:00.000Z",
  freezeThresholdF: 34,
  freezeHours: {
    coldestF: 30,
    hoursBelow34: 4.5,
    degreeHoursBelow: 9,
    readingsBelow34: 12,
    totalReadings: 500,
  },
  probes: [],
  devices: [],
  events: [],
  criticalEvents: [],
  readingsCsvUrl: "https://example.com/readings.csv",
  alertsCsvUrl: "https://example.com/alerts.csv",
  disclaimer: "disclaimer text",
  floodAlertCount: 0,
  executiveSummary: "Executive summary text",
  adjusterNotes: "Adjuster notes text",
};

describe("computeClaimsPackHash", () => {
  it("is deterministic for the same input", async () => {
    const { computeClaimsPackHash } = await import("./claimsPackExports");
    const a = await computeClaimsPackHash(basePack);
    const b = await computeClaimsPackHash(basePack);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when substantive data changes", async () => {
    const { computeClaimsPackHash } = await import("./claimsPackExports");
    const a = await computeClaimsPackHash(basePack);
    const b = await computeClaimsPackHash({
      ...basePack,
      freezeHours: { ...basePack.freezeHours, coldestF: 29 },
    });
    expect(a).not.toBe(b);
  });

  it("is unaffected by fields outside the canonical subset", async () => {
    const { computeClaimsPackHash } = await import("./claimsPackExports");
    const a = await computeClaimsPackHash(basePack);
    const b = await computeClaimsPackHash({
      ...basePack,
      readingsCsvUrl: "https://example.com/different.csv",
      disclaimer: "a different disclaimer",
    });
    expect(a).toBe(b);
  });
});

describe("createClaimsPackExport", () => {
  it("inserts a row and returns a token + matching content hash", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValueOnce({ insert });

    const { createClaimsPackExport, computeClaimsPackHash } = await import(
      "./claimsPackExports"
    );
    const expectedHash = await computeClaimsPackHash(basePack);
    const { token, contentHash, error } = await createClaimsPackExport(
      "house-1",
      basePack,
      "user-1",
    );

    expect(error).toBeNull();
    expect(token).toMatch(/^[0-9a-f]{36}$/);
    expect(contentHash).toBe(expectedHash);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "house-1",
        token,
        range_from: basePack.rangeFrom,
        range_to: basePack.rangeTo,
        content_hash: expectedHash,
        pack_data: basePack,
        generated_by: "user-1",
      }),
    );
  });

  it("returns an error and no token when the insert fails", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => Promise.resolve({ error: { message: "insert failed" } })),
    });
    const { createClaimsPackExport } = await import("./claimsPackExports");
    const result = await createClaimsPackExport("house-1", basePack, null);
    expect(result).toEqual({ token: null, contentHash: null, error: "insert failed" });
  });
});

describe("getClaimsPackExportByToken", () => {
  it("returns the stored pack_data", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { pack_data: basePack } })),
        })),
      })),
    });
    const { getClaimsPackExportByToken } = await import("./claimsPackExports");
    const result = await getClaimsPackExportByToken("some-token");
    expect(result).toEqual(basePack);
  });

  it("returns null when the token doesn't resolve", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    });
    const { getClaimsPackExportByToken } = await import("./claimsPackExports");
    expect(await getClaimsPackExportByToken("bad-token")).toBeNull();
  });
});
