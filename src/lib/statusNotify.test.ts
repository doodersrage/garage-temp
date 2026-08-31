import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchSummary = vi.fn();
vi.mock("./appStatus", () => ({
  fetchAppStatusSummary: (...args: unknown[]) => mockFetchSummary(...args),
}));

const mockListSubscribers = vi.fn();
vi.mock("./statusSubscriptions", () => ({
  listConfirmedStatusSubscribers: (...args: unknown[]) => mockListSubscribers(...args),
  buildStatusUnsubscribeUrl: (token: string) => `https://example.com/unsub?token=${token}`,
}));

const mockSendEmail = vi.fn();
vi.mock("./mailer", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

function mockQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "upsert"]) {
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
  mockFetchSummary.mockReset();
  mockListSubscribers.mockReset().mockResolvedValue([]);
  mockSendEmail.mockReset().mockResolvedValue(undefined);
  mockFrom.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkAndNotifyStatusSubscribers", () => {
  it("is a no-op when the status check itself fails", async () => {
    mockFetchSummary.mockResolvedValue(null);
    const { checkAndNotifyStatusSubscribers } = await import("./statusNotify");
    const result = await checkAndNotifyStatusSubscribers();
    expect(result).toEqual({ changed: false, healthy: null, sent: 0, errors: ["status check failed"] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("records a baseline on the first run without emailing anyone", async () => {
    mockFetchSummary.mockResolvedValue({ healthy: true });
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: null, error: null })) // read: no row yet
      .mockReturnValueOnce(mockQuery({ error: null })); // write: upsert baseline

    const { checkAndNotifyStatusSubscribers } = await import("./statusNotify");
    const result = await checkAndNotifyStatusSubscribers();

    expect(result.changed).toBe(false);
    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does nothing when health hasn't changed", async () => {
    mockFetchSummary.mockResolvedValue({ healthy: true });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { last_healthy: true }, error: null }));

    const { checkAndNotifyStatusSubscribers } = await import("./statusNotify");
    const result = await checkAndNotifyStatusSubscribers();

    expect(result.changed).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails every confirmed subscriber on a genuine transition", async () => {
    mockFetchSummary.mockResolvedValue({ healthy: false });
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { last_healthy: true }, error: null }))
      .mockReturnValueOnce(mockQuery({ error: null }));
    mockListSubscribers.mockResolvedValue([
      { email: "a@example.com", token: "ta" },
      { email: "b@example.com", token: "tb" },
    ]);

    const { checkAndNotifyStatusSubscribers } = await import("./statusNotify");
    const result = await checkAndNotifyStatusSubscribers();

    expect(result.changed).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("keeps going and reports per-recipient errors when a send fails", async () => {
    mockFetchSummary.mockResolvedValue({ healthy: true });
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { last_healthy: false }, error: null }))
      .mockReturnValueOnce(mockQuery({ error: null }));
    mockListSubscribers.mockResolvedValue([
      { email: "fails@example.com", token: "tf" },
      { email: "ok@example.com", token: "to" },
    ]);
    mockSendEmail
      .mockRejectedValueOnce(new Error("mailer down"))
      .mockResolvedValueOnce(undefined);

    const { checkAndNotifyStatusSubscribers } = await import("./statusNotify");
    const result = await checkAndNotifyStatusSubscribers();

    expect(result.changed).toBe(true);
    expect(result.sent).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("fails@example.com");
  });
});
