import { getBotConfig } from "@/lib/config";
import { generateEmbedding } from "@/lib/openai";
import { createServiceRoleClient } from "@/lib/supabase";
import { searchDocumentInKnowledge } from "@/nodes/searchDocumentInKnowledge";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  getBotConfig: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

const buildSupabaseMock = (options?: {
  rpcRows?: any[];
  filenameRows?: any[];
  countRows?: any[];
}) => {
  const rpcRows = options?.rpcRows ?? [];
  const filenameRows = options?.filenameRows ?? [];
  const countRows = options?.countRows ?? [
    { original_file_url: "https://example.com/a.pdf" },
    { original_file_url: "https://example.com/b.pdf" },
  ];

  const from = vi.fn((table: string) => {
    if (table !== "documents") {
      return {};
    }

    const state: { isFilenameFallback: boolean } = { isFilenameFallback: false };
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      not: vi.fn(() => chain),
      or: vi.fn(() => {
        state.isFilenameFallback = true;
        return chain;
      }),
      limit: vi.fn(async () => {
        if (state.isFilenameFallback) {
          return { data: filenameRows, error: null };
        }
        return { data: countRows, error: null };
      }),
    };
    return chain;
  });

  return {
    from,
    rpc: vi.fn(async () => ({ data: rpcRows, error: null })),
  };
};

describe("searchDocumentInKnowledge hybrid ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBotConfig).mockResolvedValue(null);
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
    } as any);
  });

  it("prioritizes presentation-like pdf when query asks for presentation", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildSupabaseMock({
        rpcRows: [
          {
            id: "doc-1",
            content: "conteudo catalogo",
            metadata: { filename: "Catalogo Geral.png", documentType: "image" },
            similarity: 0.82,
            original_file_url: "https://example.com/catalogo.png",
            original_file_path: "docs/catalogo.png",
            original_mime_type: "image/png",
            original_file_size: 1234,
          },
          {
            id: "doc-2",
            content: "conteudo apresentacao",
            metadata: {
              filename: "UzzApp_Apresentacao_Comercial.pdf",
              documentType: "manual",
            },
            similarity: 0.75,
            original_file_url: "https://example.com/uzzapp.pdf",
            original_file_path: "docs/uzzapp.pdf",
            original_mime_type: "application/pdf",
            original_file_size: 4567,
          },
        ],
      }) as any,
    );

    const result = await searchDocumentInKnowledge({
      query: "me manda a apresentacao do uzzapp",
      clientId: "client-1",
      openaiApiKey: "openai-test",
      maxResults: 3,
    });

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].filename).toBe("UzzApp_Apresentacao_Comercial.pdf");
  });

  it("falls back to filename search when semantic returns empty", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      buildSupabaseMock({
        rpcRows: [],
        filenameRows: [
          {
            id: "doc-file-1",
            content: "conteudo de fallback",
            metadata: { filename: "Apresentacao Convoca.pdf", documentType: "manual" },
            original_file_url: "https://example.com/convoca.pdf",
            original_file_path: "docs/convoca.pdf",
            original_mime_type: "application/pdf",
            original_file_size: 2222,
          },
        ],
      }) as any,
    );

    const result = await searchDocumentInKnowledge({
      query: "apresentacao convoca",
      clientId: "client-1",
      openaiApiKey: "openai-test",
      maxResults: 3,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].filename).toBe("Apresentacao Convoca.pdf");
    expect(result.results[0].similarity).toBe(0.5);
  });
});
