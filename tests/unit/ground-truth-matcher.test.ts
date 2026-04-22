import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findSimilarGroundTruth,
  findSimilarGroundTruthList,
} from "@/lib/ground-truth-matcher";
import { getBotConfig } from "@/lib/config";
import { generateEmbedding } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase";

vi.mock("@/lib/config", () => ({ getBotConfig: vi.fn() }));
vi.mock("@/lib/openai", () => ({ generateEmbedding: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ createServerClient: vi.fn() }));

describe("ground-truth-matcher (vitest)", () => {
  const rpcMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBotConfig).mockResolvedValue(null);
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: new Array(1536).fill(0.1),
    } as any);
    vi.mocked(createServerClient).mockResolvedValue({
      rpc: rpcMock,
    } as any);
  });

  it("returns top match", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: "gt-1",
          user_query: "q",
          expected_response: "r",
          category: "cat",
          subcategory: null,
          tags: [],
          confidence: 0.8,
          version: 1,
          similarity: 0.93,
        },
      ],
      error: null,
    });

    const result = await findSimilarGroundTruth("client-1", "qual horario");
    expect(result?.id).toBe("gt-1");
    expect(rpcMock).toHaveBeenCalledWith(
      "match_ground_truth",
      expect.objectContaining({
        filter_client_id: "client-1",
        match_count: 1,
      }),
    );
  });

  it("returns empty list when rpc fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });
    const result = await findSimilarGroundTruthList("client-1", "pergunta");
    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

