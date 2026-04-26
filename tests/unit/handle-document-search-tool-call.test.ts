import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleDocumentSearchToolCall } from "@/nodes/handleDocumentSearchToolCall";
import { searchDocumentInKnowledge } from "@/nodes/searchDocumentInKnowledge";
import { sendDocumentMessage, sendImageMessage } from "@/lib/meta";
import { saveChatMessage } from "@/nodes/saveChatMessage";
import { createServiceRoleClient } from "@/lib/supabase";

vi.mock("@/nodes/searchDocumentInKnowledge", () => ({
  searchDocumentInKnowledge: vi.fn(),
}));

vi.mock("@/lib/meta", () => ({
  sendDocumentMessage: vi.fn(),
  sendImageMessage: vi.fn(),
}));

vi.mock("@/nodes/saveChatMessage", () => ({
  saveChatMessage: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

const baseConfig: any = {
  id: "client-1",
  apiKeys: {
    openaiApiKey: "test-openai-key",
  },
};

const buildSearchResult = (filename: string, mimeType = "image/jpeg") => ({
  id: "doc-1",
  filename,
  documentType: "image",
  originalFileUrl: "https://example.com/file.jpg",
  originalFilePath: "docs/file.jpg",
  originalMimeType: mimeType,
  originalFileSize: 1234,
  similarity: 0.91,
  preview: "preview",
});

const createSupabaseMock = (options?: {
  conversationRows?: any[];
  mediaRows?: any[];
  documentRows?: any[];
}) => {
  const conversationRows = options?.conversationRows ?? [];
  const mediaRows = options?.mediaRows ?? [];
  const documentRows = options?.documentRows ?? [];

  const from = vi.fn((table: string) => {
    const state: { hasNot: boolean } = { hasNot: false };
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      or: vi.fn(() => chain),
      not: vi.fn(() => {
        state.hasNot = true;
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => {
        if (table === "n8n_chat_histories") {
          return { data: state.hasNot ? mediaRows : conversationRows, error: null };
        }
        if (table === "documents") {
          return { data: documentRows, error: null };
        }
        return { data: [], error: null };
      }),
    };
    return chain;
  });

  return { from };
};

describe("handleDocumentSearchToolCall gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock() as any,
    );
    vi.mocked(sendImageMessage).mockResolvedValue({
      messageId: "wamid-image-1",
    } as any);
    vi.mocked(sendDocumentMessage).mockResolvedValue({
      messageId: "wamid-doc-1",
    } as any);
    vi.mocked(saveChatMessage).mockResolvedValue(undefined);
  });

  it("blocks when there is no explicit document intent", async () => {
    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-1",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "quais horarios voces tem",
            document_type: "any",
          }),
        },
      },
      phone: "5551999999999",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "quais horarios voces tem hoje?",
      contactMetadata: null,
    });

    expect(result.documentGateDecision).toBe("blocked");
    expect(result.documentGateReason).toBe("no_explicit_intent");
    expect(result.useMessageAsReply).toBe(true);
    expect(result.message).not.toContain("em seguida");
    expect(searchDocumentInKnowledge).not.toHaveBeenCalled();
    expect(sendImageMessage).not.toHaveBeenCalled();
    expect(sendDocumentMessage).not.toHaveBeenCalled();
  });

  it("treats missing links complaint as explicit document intent", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [buildSearchResult("Fotos Segunda Legua.jpeg")],
      metadata: {
        totalDocumentsInBase: 3,
        chunksFound: 1,
        uniqueDocumentsFound: 1,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [],
        mediaRows: [],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-links",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "fotos segunda legua links",
            document_type: "any",
          }),
        },
      },
      phone: "5551444444444",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "voce nao enviou nenhum link",
      contactMetadata: null,
    });

    expect(result.documentGateDecision).toBe("allowed");
    expect(result.documentsSent).toBe(1);
    expect(sendImageMessage).toHaveBeenCalledTimes(1);
  });

  it("falls back to image filename search when semantic search returns only text files for image request", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [
        buildSearchResult("Colinas Segunda Legua.txt", "text/plain"),
        buildSearchResult("Colinas Segunda Legua.md", "text/markdown"),
      ],
      metadata: {
        totalDocumentsInBase: 4,
        chunksFound: 2,
        uniqueDocumentsFound: 2,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [],
        mediaRows: [],
        documentRows: [
          {
            id: "doc-image-1",
            content: "Foto da chácara Colinas Segunda Legua",
            metadata: { filename: "Colinas Segunda Legua Foto 1.jpeg" },
            original_file_url: "https://example.com/colinas.jpg",
            original_file_path: "client/image/colinas.jpg",
            original_mime_type: "image/jpeg",
            original_file_size: 1234,
          },
        ],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-image-fallback",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "Colinas da Uva Segunda Legua",
            document_type: "image",
          }),
        },
      },
      phone: "5551433333333",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "me envia as fotos da Colinas da Uva Segunda Legua",
      contactMetadata: null,
    });

    expect(result.documentGateDecision).toBe("allowed");
    expect(result.documentsSent).toBe(1);
    expect(result.filesSent).toEqual(["Colinas Segunda Legua Foto 1.jpeg"]);
    expect(sendImageMessage).toHaveBeenCalledWith(
      "5551433333333",
      "https://example.com/colinas.jpg",
      undefined,
      baseConfig,
    );
  });

  it("treats image file extension in tool query as explicit document intent", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [buildSearchResult("VALORES 2026.jpeg")],
      metadata: {
        totalDocumentsInBase: 3,
        chunksFound: 1,
        uniqueDocumentsFound: 1,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [
          { message: { type: "human", content: "oi" }, created_at: new Date().toISOString() },
          { message: { type: "human", content: "quais valores?" }, created_at: new Date().toISOString() },
        ],
        mediaRows: [],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-extension",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "VALORES 2026.jpeg",
            document_type: "image",
          }),
        },
      },
      phone: "5551422222222",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "valores",
      contactMetadata: null,
    });

    expect(result.documentGateDecision).toBe("allowed");
    expect(result.documentsSent).toBe(1);
    expect(sendImageMessage).toHaveBeenCalledTimes(1);
  });

  it("blocks plan attachment when conversation is still in discovery stage", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [buildSearchResult("Planos Umana.jpeg")],
      metadata: {
        totalDocumentsInBase: 3,
        chunksFound: 1,
        uniqueDocumentsFound: 1,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [
          {
            message: { type: "human", content: "oi" },
            created_at: new Date().toISOString(),
          },
        ],
        mediaRows: [],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-2",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "me envia a tabela de planos",
            document_type: "any",
          }),
        },
      },
      phone: "5551888888888",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "quero saber valores",
      contactMetadata: null,
    });

    expect(result.documentGateDecision).toBe("blocked");
    expect(result.documentGateReason).toBe("wrong_stage");
    expect(result.useMessageAsReply).toBe(true);
    expect(result.selectedDocument).toBe("Planos Umana.jpeg");
    expect(sendImageMessage).not.toHaveBeenCalled();
    expect(sendDocumentMessage).not.toHaveBeenCalled();
  });

  it("blocks duplicated attachment inside cooldown window", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [buildSearchResult("Planos Umana.jpeg")],
      metadata: {
        totalDocumentsInBase: 3,
        chunksFound: 1,
        uniqueDocumentsFound: 1,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [],
        mediaRows: [
          {
            media_metadata: {
              filename: "Planos Umana.jpeg",
            },
            created_at: new Date().toISOString(),
          },
        ],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-3",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "me envia a tabela de planos",
            document_type: "any",
          }),
        },
      },
      phone: "5551777777777",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "manda os planos de novo",
      contactMetadata: { objetivo: "autoconhecimento" },
    });

    expect(result.documentGateDecision).toBe("blocked");
    expect(result.documentGateReason).toBe("cooldown_duplicate");
    expect(result.useMessageAsReply).toBe(true);
    expect(sendImageMessage).not.toHaveBeenCalled();
    expect(sendDocumentMessage).not.toHaveBeenCalled();
  });

  it("allows and sends exactly one media when gates pass", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [buildSearchResult("Horarios Umana.jpeg")],
      metadata: {
        totalDocumentsInBase: 3,
        chunksFound: 1,
        uniqueDocumentsFound: 1,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [],
        mediaRows: [],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-4",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "me envia a grade completa",
            document_type: "any",
          }),
        },
      },
      phone: "5551666666666",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "pode mandar a imagem da grade",
      contactMetadata: { objetivo: "iniciar pratica" },
    });

    expect(result.documentGateDecision).toBe("allowed");
    expect(result.documentGateReason).toBe("allowed");
    expect(result.documentsSent).toBe(1);
    expect(result.filesSent).toEqual(["Horarios Umana.jpeg"]);
    expect(sendImageMessage).toHaveBeenCalledTimes(1);
  });

  it("treats presentation request as explicit and prefers presentation pdf", async () => {
    vi.mocked(searchDocumentInKnowledge).mockResolvedValue({
      results: [
        buildSearchResult("Catalogo Geral.png", "image/png"),
        buildSearchResult(
          "UzzApp_Apresentacao_Comercial.pdf",
          "application/pdf",
        ),
      ],
      metadata: {
        totalDocumentsInBase: 5,
        chunksFound: 2,
        uniqueDocumentsFound: 2,
        threshold: 0.3,
      },
    } as any);

    vi.mocked(createServiceRoleClient).mockReturnValue(
      createSupabaseMock({
        conversationRows: [],
        mediaRows: [],
      }) as any,
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "call-5",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "apresentacao uzzapp",
            document_type: "any",
          }),
        },
      },
      phone: "5551555555555",
      clientId: "client-1",
      config: baseConfig,
      userMessage: "tem apresentação do uzzapp?",
      contactMetadata: { objetivo: "entender produto" },
    });

    expect(result.documentGateDecision).toBe("allowed");
    expect(result.documentsSent).toBe(1);
    expect(result.selectedDocument).toBe("UzzApp_Apresentacao_Comercial.pdf");
    expect(sendDocumentMessage).toHaveBeenCalledTimes(1);
    expect(sendImageMessage).not.toHaveBeenCalled();
  });
});

