import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("./supabase", () => ({
  createServerClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

describe("deliverWebhookPost retry", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("succeeds on the first attempt without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { deliverWebhookPost } = await import("./webhookDeliveries");
    const promise = deliverWebhookPost("user-1", "outbound_alert", "https://example.com/hook", {}, "{}");
    const response = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response?.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, error_message: null }),
    );
  });

  it("retries once after a 503 and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("down", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { deliverWebhookPost } = await import("./webhookDeliveries");
    const promise = deliverWebhookPost("user-1", "reading", "https://example.com/hook", {}, "{}");
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response?.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("does not retry a non-retryable 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { deliverWebhookPost } = await import("./webhookDeliveries");
    const response = await deliverWebhookPost("user-1", "outbound_alert", "https://example.com/hook", {}, "{}");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response?.status).toBe(401);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, status_code: 401 }),
    );
  });

  it("refuses to fetch a private-network URL without ever calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { deliverWebhookPost } = await import("./webhookDeliveries");
    const response = await deliverWebhookPost(
      "user-1",
      "outbound_alert",
      "https://192.168.1.50/hook",
      {},
      "{}",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error_message: expect.stringContaining("Refused"),
      }),
    );
  });

  it("refuses a non-https URL without ever calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { deliverWebhookPost } = await import("./webhookDeliveries");
    const response = await deliverWebhookPost(
      "user-1",
      "reading",
      "http://example.com/hook",
      {},
      "{}",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response).toBeNull();
  });

  it("records failure after two network errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const { deliverWebhookPost } = await import("./webhookDeliveries");
    const promise = deliverWebhookPost("user-1", "outbound_alert", "https://example.com/hook", {}, "{}");
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error_message: expect.stringContaining("after retry"),
      }),
    );
  });
});
