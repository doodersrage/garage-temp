import { describe, expect, it, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("./supabase", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "server_errors") {
        return { insert: mockInsert };
      }
      return { select: vi.fn() };
    },
  }),
}));

const notifyOps = vi.fn().mockResolvedValue(undefined);
vi.mock("./opsNotify", () => ({
  notifyOps,
}));

describe("serverErrors", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    notifyOps.mockClear();
  });

  it("records error details and notifies ops", async () => {
    const { recordServerError } = await import("./serverErrors");
    const err = new Error("boom");
    err.stack = "Error: boom\n    at test.ts:1:1";

    await recordServerError({
      path: "/dashboard/history",
      method: "GET",
      error: err,
      userId: "user-1",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/dashboard/history",
        method: "GET",
        message: "boom",
        user_id: "user-1",
      }),
    );
    expect(notifyOps).toHaveBeenCalledWith(
      "ThermalTrace page error: /dashboard/history",
      expect.stringContaining("boom"),
    );
  });

  it("truncates long paths and stringifies non-Error values", async () => {
    const { recordServerError } = await import("./serverErrors");
    await recordServerError({
      path: "/x".repeat(600),
      error: { code: "fail" },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "[object Object]",
        stack: null,
      }),
    );
    expect(mockInsert.mock.calls[0]?.[0]?.path).toHaveLength(500);
  });
});
