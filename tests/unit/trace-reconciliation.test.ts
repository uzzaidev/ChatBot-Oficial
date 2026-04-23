import {
  reconcileTraceForWhatsAppStatus,
  reconcileTraces,
} from "@/lib/trace-reconciliation";
import { query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/postgres", () => ({
  query: vi.fn(),
}));

const createThenableQuery = (result: { data?: any; error?: any }) => {
  const query: any = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    update: vi.fn(() => query),
    then: (resolve: (value: any) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
};

describe("trace-reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconcileTraceForWhatsAppStatus updates trace row by wamid", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any);

    await reconcileTraceForWhatsAppStatus({
      clientId: "client-1",
      wamid: "wamid.123",
      whatsappStatus: "delivered",
      timestampIso: "2026-04-23T10:00:00.000Z",
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE message_traces"),
      expect.arrayContaining([
        "client-1",
        "wamid.123",
        "delivered",
        "2026-04-23T10:00:00.000Z",
      ]),
    );
  });

  it("reconcileTraces returns dry-run summary with pending bucket and status change", async () => {
    const tracesQuery = createThenableQuery({
      data: [
        {
          id: "trace-1",
          client_id: "client-1",
          phone: "5551999999999",
          status: "pending",
          whatsapp_message_id: "wamid.abc",
          webhook_received_at: "2026-04-23T09:00:00.000Z",
          generation_started_at: "2026-04-23T09:00:10.000Z",
          generation_completed_at: "2026-04-23T09:00:20.000Z",
          sent_at: null,
          agent_response: null,
          metadata: {},
          created_at: "2026-04-23T09:00:00.000Z",
        },
      ],
      error: null,
    });

    const historyByPhoneQuery = createThenableQuery({
      data: [],
      error: null,
    });

    const historyByWamidQuery = createThenableQuery({
      data: [
        {
          id: "hist-1",
          session_id: "5551999999999",
          wamid: "wamid.abc",
          status: "sent",
          message: { type: "ai", content: "Resposta" },
          created_at: "2026-04-23T09:00:21.000Z",
        },
      ],
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === "message_traces") return tracesQuery;
      if (table === "n8n_chat_histories") {
        const n8nCallCount = from.mock.calls.filter(
          ([name]) => name === "n8n_chat_histories",
        ).length;
        return n8nCallCount === 1 ? historyByPhoneQuery : historyByWamidQuery;
      }
      return createThenableQuery({ data: [], error: null });
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({ from } as any);

    const result = await reconcileTraces({
      clientId: "client-1",
      dryRun: true,
      lookbackHours: 24,
      limit: 50,
    });

    expect(result.scanned).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.statusToSuccess).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.buckets.geracao_concluida_sem_envio).toBe(1);
  });
});
