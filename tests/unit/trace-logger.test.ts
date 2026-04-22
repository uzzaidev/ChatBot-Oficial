import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTraceLogger, sanitizePII } from "@/lib/trace-logger";
import { createServiceRoleClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

describe("trace-logger (vitest)", () => {
  const upsertMock = vi.fn();
  const insertMock = vi.fn();
  const fromMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "message_traces") return { upsert: upsertMock };
      return { insert: insertMock };
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: fromMock,
    } as any);
  });

  it("sanitizes cpf/card/email", () => {
    process.env.PII_SANITIZATION_ENABLED = "true";
    const input =
      "cpf 123.456.789-00 card 4111 1111 1111 1111 email a@b.com";
    const output = sanitizePII(input);
    expect(output).toContain("[CPF_REDACTED]");
    expect(output).toContain("[CARD_REDACTED]");
    expect(output).toContain("[EMAIL_REDACTED]");
  });

  it("persists successful trace with generation data", async () => {
    const logger = createTraceLogger({
      clientId: "client-1",
      phone: "555499999999",
      userMessage: "oi",
      whatsappMessageId: "wamid-1",
      conversationId: "conv-1",
    });

    logger.markStage("webhook_received");
    logger.markStage("generation_started");
    logger.markStage("generation_completed");
    logger.markStage("sent");
    logger.setGenerationData({
      model: "gpt-4o",
      tokensInput: 10,
      tokensOutput: 5,
      costUsd: 0.0003,
      response: "resposta",
    });

    const traceId = await logger.finish();
    expect(traceId).toBeTruthy();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: traceId,
        client_id: "client-1",
        status: "success",
        model_used: "gpt-4o",
        tokens_input: 10,
        tokens_output: 5,
      }),
      { onConflict: "id" },
    );
  });
});

