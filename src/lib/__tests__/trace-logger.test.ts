import { createTraceLogger, sanitizePII } from "@/lib/trace-logger";
import { createServiceRoleClient } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  createServiceRoleClient: jest.fn(),
}));

describe("trace-logger", () => {
  const fromMock = jest.fn();
  const upsertMock = jest.fn();
  const insertMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    upsertMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "message_traces") {
        return { upsert: upsertMock };
      }
      return { insert: insertMock };
    });

    (createServiceRoleClient as jest.Mock).mockReturnValue({
      from: fromMock,
    });
  });

  it("sanitizePII should mask cpf, card and email", () => {
    process.env.PII_SANITIZATION_ENABLED = "true";
    const input =
      "CPF 123.456.789-09 cartao 4111 1111 1111 1111 email teste@empresa.com";
    const output = sanitizePII(input);

    expect(output).toContain("[CPF_REDACTED]");
    expect(output).toContain("[CARD_REDACTED]");
    expect(output).toContain("[EMAIL_REDACTED]");
  });

  it("sanitizePII should keep original text when disabled", () => {
    process.env.PII_SANITIZATION_ENABLED = "false";
    const input = "CPF 123.456.789-09";
    const output = sanitizePII(input);

    expect(output).toBe(input);
  });

  it("finish should persist message, retrieval and tool call traces", async () => {
    const logger = createTraceLogger({
      clientId: "client-1",
      phone: "555499999999",
      userMessage: "meu cpf 123.456.789-09",
      whatsappMessageId: "wamid-1",
      conversationId: "conv-1",
    });

    logger.markStage("webhook_received");
    logger.markStage("generation_started");
    logger.markStage("generation_completed");
    logger.markStage("sent");

    logger.setGenerationData({
      model: "gpt-4o",
      tokensInput: 100,
      tokensOutput: 30,
      costUsd: 0.0012,
      response: "me chama no email teste@empresa.com",
    });

    logger.setRetrievalData({
      chunkIds: ["doc-1", "doc-2"],
      similarityScores: [0.91, 0.84],
      topK: 2,
      threshold: 0.75,
      strategy: "cosine_top_k",
    });

    logger.logToolCall({
      toolName: "registrar_dado_cadastral",
      arguments: { campo: "email" },
      result: { updated: true },
      status: "success",
      source: "agent",
      startedAt: new Date("2026-04-21T12:00:00.000Z"),
      completedAt: new Date("2026-04-21T12:00:00.150Z"),
    });

    const traceId = await logger.finish();

    expect(traceId).toBeTruthy();
    expect(fromMock).toHaveBeenCalledWith("message_traces");
    expect(fromMock).toHaveBeenCalledWith("retrieval_traces");
    expect(fromMock).toHaveBeenCalledWith("tool_call_traces");

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: traceId,
        client_id: "client-1",
        phone: "555499999999",
        whatsapp_message_id: "wamid-1",
        conversation_id: "conv-1",
        model_used: "gpt-4o",
        tokens_input: 100,
        tokens_output: 30,
        cost_usd: 0.0012,
        status: "success",
      }),
      { onConflict: "id" },
    );

    expect(insertMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        trace_id: traceId,
        client_id: "client-1",
        chunk_ids: ["doc-1", "doc-2"],
        top_k: 2,
        threshold: 0.75,
      }),
    );

    expect(insertMock).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          trace_id: traceId,
          client_id: "client-1",
          tool_name: "registrar_dado_cadastral",
          status: "success",
          source: "agent",
          latency_ms: 150,
        }),
      ]),
    );
  });

  it("finish should persist failed status when setError is called", async () => {
    const logger = createTraceLogger({
      clientId: "client-2",
      phone: "555488888888",
      userMessage: "oi",
    });

    logger.setError("timeout");
    await logger.finish();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-2",
        status: "failed",
      }),
      { onConflict: "id" },
    );
  });

  it("finish should log console.error for non-relation insert errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    upsertMock.mockResolvedValueOnce({ error: { message: "permission denied" } });
    insertMock
      .mockResolvedValueOnce({ error: { message: "permission denied" } }) // retrieval
      .mockResolvedValueOnce({ error: { message: "permission denied" } }); // tools

    const logger = createTraceLogger({
      clientId: "client-3",
      phone: "555477777777",
      userMessage: "teste",
    });

    logger.setRetrievalData({
      chunkIds: ["doc-1"],
      similarityScores: [0.9],
      topK: 1,
      threshold: 0.7,
    });

    logger.logToolCall({
      toolName: "buscar_documento",
      arguments: { q: "planos" },
      status: "error",
      source: "agent",
      errorMessage: "permission denied",
      startedAt: new Date("2026-04-21T12:10:00.000Z"),
      completedAt: new Date("2026-04-21T12:10:00.010Z"),
    });

    await logger.finish();

    expect(errorSpy).toHaveBeenCalledWith(
      "[trace-logger] message_traces insert error:",
      "permission denied",
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[trace-logger] retrieval_traces insert error:",
      "permission denied",
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[trace-logger] tool_call_traces insert error:",
      "permission denied",
    );

    errorSpy.mockRestore();
  });

  it("finish should warn once when trace tables are missing", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    upsertMock.mockResolvedValue({ error: { message: 'relation "message_traces" does not exist' } });
    insertMock.mockResolvedValue({
      error: { message: 'relation "retrieval_traces" does not exist' },
    });

    const logger = createTraceLogger({
      clientId: "client-4",
      phone: "555466666666",
      userMessage: "teste missing tables",
    });

    logger.setRetrievalData({
      chunkIds: ["doc-2"],
      similarityScores: [0.8],
      topK: 1,
      threshold: 0.7,
    });

    logger.logToolCall({
      toolName: "transferir_atendimento",
      arguments: {},
      status: "success",
      source: "system",
      startedAt: new Date("2026-04-21T12:20:00.000Z"),
      completedAt: new Date("2026-04-21T12:20:00.050Z"),
    });

    await logger.finish();

    // first missing relation warns once; subsequent missing-table errors are suppressed
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('Table "message_traces" not found');

    warnSpy.mockRestore();
  });

  it("should generate fallback trace id when crypto.randomUUID is unavailable", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");

    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });

    const logger = createTraceLogger({
      clientId: "client-5",
      phone: "555455555555",
      userMessage: "fallback id",
    });

    expect(logger.traceId).toContain("-");

    if (originalDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalDescriptor);
    }
  });
});
