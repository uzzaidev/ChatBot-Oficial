import { POST as bulkFromTrace } from "@/app/api/ground-truth/from-trace/bulk/route";
import { generateEmbedding } from "@/lib/openai";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/openai", () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
  createRouteHandlerClient: vi.fn(),
}));

describe("API /api/ground-truth/from-trace/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);

    const request = {
      json: async () => ({ items: [] }),
    } as any;

    const response = await bulkFromTrace(request);
    expect(response.status).toBe(401);
  });

  it("creates batch items", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: Array(1536).fill(0.01),
      usage: { prompt_tokens: 0, total_tokens: 0 },
      model: "text-embedding-3-small",
      provider: "openai",
    } as any);

    const fromMock = vi.fn((table: string) => {
      if (table === "message_traces") {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({
                data: [
                  {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    user_message: "Quero saber horarios",
                    agent_response: "Temos aulas de segunda a sabado.",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "ground_truth") {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "gt-1" }, error: null }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        }),
      };
    });

    vi.mocked(createRouteHandlerClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: fromMock,
    } as any);

    const request = {
      json: async () => ({
        items: [
          {
            trace_id: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      }),
    } as any;

    const response = await bulkFromTrace(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.summary.created).toBe(1);
  });
});
