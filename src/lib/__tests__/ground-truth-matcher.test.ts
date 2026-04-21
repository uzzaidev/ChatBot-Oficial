import {
  findSimilarGroundTruth,
  findSimilarGroundTruthList,
} from "@/lib/ground-truth-matcher";
import { getBotConfig } from "@/lib/config";
import { generateEmbedding } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase";

jest.mock("@/lib/config", () => ({
  getBotConfig: jest.fn(),
}));

jest.mock("@/lib/openai", () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  createServerClient: jest.fn(),
}));

describe("ground-truth-matcher", () => {
  const rpcMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getBotConfig as jest.Mock).mockResolvedValue(null);
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.1),
    });
    (createServerClient as jest.Mock).mockResolvedValue({
      rpc: rpcMock,
    });
  });

  it("retorna top-1 quando houver match", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: "gt-1",
          user_query: "q",
          expected_response: "r",
          category: "horarios",
          subcategory: null,
          tags: [],
          confidence: 0.8,
          version: 1,
          similarity: 0.92,
        },
      ],
      error: null,
    });

    const result = await findSimilarGroundTruth("client-1", "qual horario");

    expect(result?.id).toBe("gt-1");
    expect(result?.similarity).toBe(0.92);
    expect(rpcMock).toHaveBeenCalledWith(
      "match_ground_truth",
      expect.objectContaining({
        filter_client_id: "client-1",
        match_count: 1,
      }),
    );
  });

  it("usa threshold do bot config quando não informado", async () => {
    (getBotConfig as jest.Mock).mockResolvedValueOnce(0.85);
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    await findSimilarGroundTruth("client-1", "pergunta");

    expect(rpcMock).toHaveBeenCalledWith(
      "match_ground_truth",
      expect.objectContaining({ match_threshold: 0.85 }),
    );
  });

  it("retorna lista vazia quando RPC falha", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });

    const result = await findSimilarGroundTruthList("client-1", "pergunta");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("valida dimensão do embedding", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValueOnce({
      embedding: new Array(512).fill(0.1),
    });

    await expect(
      findSimilarGroundTruth("client-1", "pergunta"),
    ).rejects.toThrow("Invalid embedding dimensions");
  });
});

