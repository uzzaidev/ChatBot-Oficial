/**
 * Platform billing: payments must not be lost when processing fails.
 * - webhook answers 500 on failure so Stripe retries, and the retry is processed
 * - sync maps checkout subscriptions via customer metadata and surfaces DB errors
 */

const events = new Map<string, { status: string }>();
let upsertError: any = null;
let lastUpsert: any = null;

const run = (q: any) => {
  if (q.table === "webhook_events") {
    const id = q.payload?.stripe_event_id ?? q.filters.stripe_event_id;
    const row = events.get(id);
    if (q.op === "insert") {
      if (row) return { error: { code: "23505" } };
      events.set(id, { status: q.payload.status });
      return { error: null };
    }
    if (q.op === "update") {
      if (!row || (q.filters.status && row.status !== q.filters.status)) {
        return { data: [], error: null };
      }
      Object.assign(row, q.payload);
      return { data: [{ id }], error: null };
    }
  }
  if (q.op === "upsert" && q.table === "platform_client_subscriptions") {
    lastUpsert = q.payload;
    return { data: null, error: upsertError };
  }
  return { data: null, error: null };
};

const fakeSupabase = {
  from: (table: string) => {
    const q: any = { table, filters: {}, op: "select", payload: null };
    const b: any = {
      insert: (p: any) => ((q.op = "insert"), (q.payload = p), b),
      update: (p: any) => ((q.op = "update"), (q.payload = p), b),
      upsert: (p: any) => ((q.op = "upsert"), (q.payload = p), b),
      select: () => b,
      eq: (k: string, v: any) => ((q.filters[k] = v), b),
      maybeSingle: () => b,
      then: (res: any, rej: any) => Promise.resolve(run(q)).then(res, rej),
    };
    return b;
  },
};

const retrieve = jest.fn();
let nextEvent: any;

jest.mock("@/lib/supabase-server", () => ({
  createServiceClient: () => fakeSupabase,
}));
jest.mock("@/lib/stripe", () => ({
  constructWebhookEvent: () => nextEvent,
  getStripeClient: () => ({ subscriptions: { retrieve } }),
}));
jest.mock("@/lib/billing-lifecycle", () => ({
  clearGracePeriod: jest.fn(),
  enforceNonPayment: jest.fn(),
  startGracePeriod: jest.fn(),
}));

import { POST } from "@/app/api/stripe/platform/webhooks/route";
import { syncPlatformSubscription } from "@/lib/platform-subscription-sync";

const subscription = {
  id: "sub_1",
  status: "active",
  metadata: {},
  customer: { id: "cus_1", metadata: { client_id: "client-1" } },
  items: { data: [] },
};

const post = () =>
  POST(
    new Request("http://x/api/stripe/platform/webhooks", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    }) as any,
  );

beforeEach(() => {
  events.clear();
  upsertError = null;
  lastUpsert = null;
  process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = "whsec_test";
  nextEvent = {
    id: "evt_1",
    type: "customer.subscription.updated",
    livemode: false,
    data: { object: { id: "sub_1" } },
  };
});

describe("platform Stripe webhook", () => {
  it("returns 500 on failure and processes Stripe's retry", async () => {
    retrieve.mockRejectedValueOnce(new Error("stripe timeout"));
    const first = await post();
    expect(first.status).toBe(500);
    expect(events.get("evt_1")?.status).toBe("failed");

    retrieve.mockResolvedValueOnce(subscription);
    const retry = await post();
    expect(retry.status).toBe(200);
    expect(events.get("evt_1")?.status).toBe("processed");
  });

  it("ignores events already processed", async () => {
    events.set("evt_1", { status: "processed" });
    const res = await post();
    expect((await res.json()).duplicate).toBe(true);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("syncs from invoices that use the pre-2025 `subscription` field", async () => {
    nextEvent = {
      id: "evt_2",
      type: "invoice.paid",
      data: { object: { id: "in_1", customer: "cus_1", subscription: "sub_1" } },
    };
    retrieve.mockResolvedValueOnce(subscription);
    expect((await post()).status).toBe(200);
    expect(retrieve).toHaveBeenCalledWith("sub_1", { expand: ["customer"] });
  });
});

describe("syncPlatformSubscription", () => {
  it("maps a checkout subscription via customer metadata", async () => {
    retrieve.mockResolvedValueOnce(subscription);
    await syncPlatformSubscription("sub_1");
    expect(lastUpsert).toMatchObject({
      client_id: "client-1",
      stripe_customer_id: "cus_1",
      status: "active",
    });
  });

  it("throws when the subscription upsert fails instead of losing it", async () => {
    upsertError = { message: "violates check constraint" };
    retrieve.mockResolvedValueOnce(subscription);
    await expect(syncPlatformSubscription("sub_1")).rejects.toThrow(
      /platform_client_subscriptions upsert/,
    );
  });
});
