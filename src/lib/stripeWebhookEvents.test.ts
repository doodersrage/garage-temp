import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();

vi.mock("./supabase", () => ({
  createServerClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

describe("claimStripeWebhookEvent", () => {
  beforeEach(() => {
    mockInsert.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("claims a new event id", async () => {
    mockInsert.mockResolvedValue({ error: null });
    const { claimStripeWebhookEvent } = await import("./stripeWebhookEvents");

    const result = await claimStripeWebhookEvent("evt_1", "checkout.session.completed");

    expect(result.alreadyProcessed).toBe(false);
    expect(mockInsert).toHaveBeenCalledWith({
      id: "evt_1",
      type: "checkout.session.completed",
    });
  });

  it("recognizes a duplicate delivery via unique_violation", async () => {
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const { claimStripeWebhookEvent } = await import("./stripeWebhookEvents");

    const result = await claimStripeWebhookEvent("evt_1", "checkout.session.completed");

    expect(result.alreadyProcessed).toBe(true);
  });

  it("fails open (processes the event) on an unrelated DB error", async () => {
    mockInsert.mockResolvedValue({ error: { code: "08000", message: "connection error" } });
    const { claimStripeWebhookEvent } = await import("./stripeWebhookEvents");

    const result = await claimStripeWebhookEvent("evt_1", "checkout.session.completed");

    expect(result.alreadyProcessed).toBe(false);
  });
});
