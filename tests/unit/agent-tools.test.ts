import { buildAllowedTools, getAllowedToolNames } from "@/lib/agent-tools";
import type { ClientConfig } from "@/lib/types";
import { describe, expect, it } from "vitest";

const makeConfig = (
  settings: Partial<ClientConfig["settings"]>,
): ClientConfig =>
  ({
    id: "client-1",
    name: "Cliente",
    settings: {
      enableTools: true,
      enableRAG: true,
      enableHumanHandoff: false,
      enableDocumentSearch: false,
      enableAudioResponse: false,
      batchingDelaySeconds: 10,
      maxTokens: 2000,
      maxInputTokens: 24000,
      maxHistoryTokens: 6000,
      maxKnowledgeTokens: 6000,
      reasoningEffort: "low",
      temperature: 0.3,
      messageSplitEnabled: false,
      maxChatHistory: 15,
      messageDelayMs: 1000,
      ...settings,
    },
  }) as ClientConfig;

describe("agent tools", () => {
  it("only exposes tools enabled for the active agent", () => {
    const tools = buildAllowedTools({
      config: makeConfig({
        enableHumanHandoff: true,
        enableDocumentSearch: false,
        enableAudioResponse: true,
      }),
    });

    expect(Object.keys(tools ?? {}).sort()).toEqual([
      "buscar_conhecimento",
      "enviar_resposta_em_audio",
      "registrar_dado_cadastral",
      "transferir_atendimento",
    ]);
  });

  it("returns no tools when function calling is disabled", () => {
    const tools = buildAllowedTools({
      config: makeConfig({ enableTools: false, enableDocumentSearch: true }),
    });

    expect(tools).toBeUndefined();
  });

  it("keeps document sending separate from knowledge search", () => {
    const names = getAllowedToolNames({
      config: makeConfig({ enableDocumentSearch: true, enableRAG: true }),
    });

    expect(names.has("buscar_conhecimento")).toBe(true);
    expect(names.has("buscar_documento")).toBe(true);
  });
});
