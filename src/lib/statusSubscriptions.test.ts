import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSendEmail = vi.fn();
vi.mock("./mailer", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

function mockQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "insert", "update", "delete", "not"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
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

beforeEach(() => {
  mockSendEmail.mockReset().mockResolvedValue(undefined);
  mockFrom.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subscribeToStatusUpdates", () => {
  it("rejects an invalid email without touching the database", async () => {
    const { subscribeToStatusUpdates } = await import("./statusSubscriptions");
    const result = await subscribeToStatusUpdates("not-an-email");
    expect(result.ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("creates a new subscription and emails a confirm link", async () => {
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: null, error: null }))
      .mockReturnValueOnce(mockQuery({ error: null }));

    const { subscribeToStatusUpdates } = await import("./statusSubscriptions");
    const result = await subscribeToStatusUpdates("New@Example.com");

    expect(result.ok).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0]).toBe("new@example.com");
  });

  it("re-sends confirmation for an existing unconfirmed subscriber", async () => {
    mockFrom
      .mockReturnValueOnce(
        mockQuery({ data: { id: "row1", token: "old", confirmed_at: null }, error: null }),
      )
      .mockReturnValueOnce(mockQuery({ error: null }));

    const { subscribeToStatusUpdates } = await import("./statusSubscriptions");
    const result = await subscribeToStatusUpdates("pending@example.com");

    expect(result.ok).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("is a silent no-op for an already-confirmed subscriber (no duplicate email)", async () => {
    mockFrom.mockReturnValueOnce(
      mockQuery({
        data: { id: "row1", token: "tok", confirmed_at: "2026-01-01T00:00:00.000Z" },
        error: null,
      }),
    );

    const { subscribeToStatusUpdates } = await import("./statusSubscriptions");
    const result = await subscribeToStatusUpdates("confirmed@example.com");

    expect(result.ok).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("confirmStatusSubscription", () => {
  it("rejects an unknown token", async () => {
    mockFrom.mockReturnValueOnce(mockQuery({ data: null, error: null }));
    const { confirmStatusSubscription } = await import("./statusSubscriptions");
    const result = await confirmStatusSubscription("bogus");
    expect(result.ok).toBe(false);
  });

  it("confirms a pending subscription", async () => {
    mockFrom
      .mockReturnValueOnce(
        mockQuery({ data: { id: "row1", confirmed_at: null }, error: null }),
      )
      .mockReturnValueOnce(mockQuery({ error: null }));

    const { confirmStatusSubscription } = await import("./statusSubscriptions");
    const result = await confirmStatusSubscription("tok123");
    expect(result.ok).toBe(true);
  });

  it("is idempotent for an already-confirmed token", async () => {
    mockFrom.mockReturnValueOnce(
      mockQuery({
        data: { id: "row1", confirmed_at: "2026-01-01T00:00:00.000Z" },
        error: null,
      }),
    );

    const { confirmStatusSubscription } = await import("./statusSubscriptions");
    const result = await confirmStatusSubscription("tok123");
    expect(result.ok).toBe(true);
    // No second .from() call for an update -- only the lookup.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe("unsubscribeStatusSubscription", () => {
  it("deletes the row for a valid token", async () => {
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: "row1" }, error: null }))
      .mockReturnValueOnce(mockQuery({ error: null }));

    const { unsubscribeStatusSubscription } = await import("./statusSubscriptions");
    const result = await unsubscribeStatusSubscription("tok123");
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown token", async () => {
    mockFrom.mockReturnValueOnce(mockQuery({ data: null, error: null }));
    const { unsubscribeStatusSubscription } = await import("./statusSubscriptions");
    const result = await unsubscribeStatusSubscription("bogus");
    expect(result.ok).toBe(false);
  });
});

describe("listConfirmedStatusSubscribers", () => {
  it("returns confirmed subscribers", async () => {
    mockFrom.mockReturnValueOnce(
      mockQuery({
        data: [{ email: "a@example.com", token: "t1" }],
        error: null,
      }),
    );

    const { listConfirmedStatusSubscribers } = await import("./statusSubscriptions");
    const result = await listConfirmedStatusSubscribers();
    expect(result).toEqual([{ email: "a@example.com", token: "t1" }]);
  });

  it("returns an empty list on error rather than throwing", async () => {
    mockFrom.mockReturnValueOnce(mockQuery({ data: null, error: { message: "boom" } }));
    const { listConfirmedStatusSubscribers } = await import("./statusSubscriptions");
    const result = await listConfirmedStatusSubscribers();
    expect(result).toEqual([]);
  });
});
