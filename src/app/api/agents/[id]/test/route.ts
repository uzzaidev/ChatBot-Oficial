/**
 * API Route: /api/agents/[id]/test
 *
 * Tests an agent with full production parity:
 *  - Real ClientConfig from Vault (tools, RAG, calendar, handoff, etc)
 *  - Compiled prompts from form (liveConfig) or saved agent
 *  - Optional real chat history loaded from a selected conversation phone
 *  - Real RAG context lookup against the client's knowledge base
 *
 * It does NOT save messages, log usage to billing, or trigger CRM/Redis side effects.
 */

import { getClientConfig } from "@/lib/config";
import {
  compileFormatterPrompt,
  compileSystemPrompt,
} from "@/lib/prompt-builder";
import { createServerClient } from "@/lib/supabase";
import type { Agent, ClientConfig } from "@/lib/types";
import { generateAIResponse } from "@/nodes/generateAIResponse";
import { getChatHistory } from "@/nodes/getChatHistory";
import { getRAGContextWithTrace } from "@/nodes/getRAGContext";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/[id]/test
 * Send a test message to the agent and get a response with full prod-parity flow.
 *
 * Body:
 *  - message: string (required)
 *  - liveConfig?: Partial<Agent> (form values to override the saved agent)
 *  - historyPhone?: string (optional phone to load real chat history)
 *  - clientHistory?: Array<{ role: 'user'|'assistant'; content: string }> (in-modal chat turns to chain)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Saved agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      message,
      liveConfig,
      historyPhone,
      clientHistory,
    }: {
      message: string;
      liveConfig?: Partial<Agent>;
      historyPhone?: string;
      clientHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Merge saved agent + liveConfig (form preview)
    const mergedAgent: Agent = liveConfig
      ? ({ ...agent, ...liveConfig } as Agent)
      : (agent as Agent);

    const compiledSystemPrompt = liveConfig
      ? compileSystemPrompt(mergedAgent)
      : agent.compiled_system_prompt || compileSystemPrompt(mergedAgent);
    const compiledFormatterPrompt = liveConfig
      ? compileFormatterPrompt(mergedAgent)
      : agent.compiled_formatter_prompt || compileFormatterPrompt(mergedAgent);

    // Load full ClientConfig (Vault credentials, RAG, tools, calendar, handoff, etc)
    const baseConfig = await getClientConfig(profile.client_id);
    if (!baseConfig) {
      return NextResponse.json(
        {
          error:
            "Configuração do cliente não encontrada. Verifique credenciais em Configurações.",
        },
        { status: 422 },
      );
    }

    // Override the runtime config with the agent being tested (compiled prompts + settings + models)
    const config: ClientConfig = {
      ...baseConfig,
      prompts: {
        systemPrompt: compiledSystemPrompt,
        formatterPrompt: compiledFormatterPrompt || undefined,
      },
      models: {
        openaiModel: mergedAgent.openai_model || baseConfig.models.openaiModel,
        groqModel: mergedAgent.groq_model || baseConfig.models.groqModel,
      },
      primaryProvider:
        (mergedAgent.primary_provider as ClientConfig["primaryProvider"]) ||
        baseConfig.primaryProvider,
      settings: {
        ...baseConfig.settings,
        temperature: mergedAgent.temperature ?? baseConfig.settings.temperature,
        maxTokens: mergedAgent.max_tokens ?? baseConfig.settings.maxTokens,
        maxInputTokens:
          mergedAgent.max_input_tokens ?? baseConfig.settings.maxInputTokens,
        maxHistoryTokens:
          mergedAgent.max_history_tokens ??
          baseConfig.settings.maxHistoryTokens,
        maxKnowledgeTokens:
          mergedAgent.max_knowledge_tokens ??
          baseConfig.settings.maxKnowledgeTokens,
        reasoningEffort:
          mergedAgent.reasoning_effort ?? baseConfig.settings.reasoningEffort,
        enableTools:
          mergedAgent.enable_tools ?? baseConfig.settings.enableTools,
        enableRAG: mergedAgent.enable_rag ?? baseConfig.settings.enableRAG,
        enableHumanHandoff:
          mergedAgent.enable_human_handoff ??
          baseConfig.settings.enableHumanHandoff,
        enableDocumentSearch:
          mergedAgent.enable_document_search ??
          baseConfig.settings.enableDocumentSearch,
        enableAudioResponse:
          mergedAgent.enable_audio_response ??
          baseConfig.settings.enableAudioResponse,
        maxChatHistory:
          mergedAgent.max_chat_history ?? baseConfig.settings.maxChatHistory,
      },
      activeAgent: mergedAgent,
    };

    // Load chat history (real conversation OR in-modal turns)
    let chatHistory: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      timestamp?: string;
    }> = [];
    let historySource: "selected_conversation" | "in_modal" | "none" = "none";
    let historyMessageCount = 0;
    let realCustomerName: string | null = null;
    let realCustomerMetadata: Record<string, unknown> | null = null;

    if (historyPhone) {
      try {
        const result = await getChatHistory({
          phone: historyPhone,
          clientId: profile.client_id,
          maxHistory: config.settings.maxChatHistory,
          maxHistoryTokens: config.settings.maxHistoryTokens,
        });
        chatHistory = result.messages;
        historySource = "selected_conversation";
        historyMessageCount = result.messages.length;

        // Look up real customer name + metadata so the agent has the same
        // context it would have in production.
        try {
          const supabaseAny = supabase as unknown as {
            from: (t: string) => {
              select: (cols: string) => {
                eq: (
                  k: string,
                  v: string,
                ) => {
                  eq: (
                    k: string,
                    v: string,
                  ) => {
                    maybeSingle: () => Promise<{
                      data: {
                        nome?: string;
                        metadata?: Record<string, unknown>;
                      } | null;
                    }>;
                  };
                };
              };
            };
          };
          const { data: customer } = await supabaseAny
            .from("clientes_whatsapp")
            .select("nome, metadata")
            .eq("telefone", historyPhone)
            .eq("client_id", profile.client_id)
            .maybeSingle();
          if (customer) {
            realCustomerName = customer.nome || null;
            realCustomerMetadata = customer.metadata || null;
          }
        } catch (err) {
          console.warn("[test-agent] customer lookup failed:", err);
        }
      } catch (err) {
        console.warn(
          "[test-agent] Failed to load history for phone",
          historyPhone,
          err,
        );
      }
    } else if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      chatHistory = clientHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      historySource = "in_modal";
      historyMessageCount = clientHistory.length;
    }

    // RAG context (only if enabled in agent config)
    let ragContext = "";
    let ragChunkCount = 0;
    let ragChunks: Array<{ snippet: string; similarity: number | null }> = [];
    if (config.settings.enableRAG) {
      try {
        const ragResult = await getRAGContextWithTrace({
          query: message,
          clientId: profile.client_id,
          openaiApiKey: config.apiKeys.openaiApiKey,
        });
        ragContext = ragResult.context;
        ragChunkCount = ragResult.traceData?.chunkIds.length || 0;

        // Parse chunks from the context string for hover preview
        if (ragContext) {
          const blocks = ragContext.split("\n\n---\n\n");
          const scores = ragResult.traceData?.similarityScores || [];
          ragChunks = blocks.map((block, i) => {
            // Strip the "[Documento N - Relevancia: X%]" header line
            const stripped = block
              .replace(/^\[Documento[^\]]+\]\s*/, "")
              .trim();
            const snippet =
              stripped.length > 600 ? stripped.slice(0, 600) + "…" : stripped;
            return { snippet, similarity: scores[i] ?? null };
          });
        }
      } catch (err) {
        console.warn("[test-agent] RAG lookup failed:", err);
      }
    }

    // Generate AI response with FULL production flow (tools, RAG, etc)
    const startTime = Date.now();
    const aiResponse = await generateAIResponse({
      message,
      chatHistory,
      ragContext,
      customerName:
        realCustomerName || (historyPhone ? historyPhone : "Cliente Teste"),
      contactMetadata: realCustomerMetadata || undefined,
      config,
      includeDateTimeInfo: true,
      enableTools: config.settings.enableTools,
      phone: historyPhone,
    });
    const latencyMs = Date.now() - startTime;

    // ===== Execute SAFE tool calls in test mode =====
    // We run read-only tools (buscar_documento) so the test chat can preview
    // documents/images inline. Side-effect tools (transferir_atendimento,
    // enviar_resposta_em_audio, criar_evento_agenda, etc.) are NOT executed —
    // we only report their args back so the user can verify the call.
    const attachments: Array<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
      similarity?: number;
    }> = [];
    const executedTools: Array<{
      name: string;
      arguments: Record<string, unknown>;
      executed: boolean;
      result?: unknown;
    }> = [];

    if (
      Array.isArray(aiResponse.toolCalls) &&
      aiResponse.toolCalls.length > 0
    ) {
      const { searchDocumentInKnowledge } = await import(
        "@/nodes/searchDocumentInKnowledge"
      );

      for (const tc of aiResponse.toolCalls) {
        const name = tc?.function?.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc?.function?.arguments || "{}");
        } catch {
          args = {};
        }

        if (name === "buscar_documento") {
          try {
            const searchResult = await searchDocumentInKnowledge({
              query: String(args.query || message),
              clientId: profile.client_id,
              documentType: args.document_type
                ? String(args.document_type)
                : undefined,
              openaiApiKey: config.apiKeys.openaiApiKey,
            });

            for (const doc of searchResult.results.slice(0, 3)) {
              if (doc.originalFileUrl) {
                attachments.push({
                  url: doc.originalFileUrl,
                  filename: doc.filename,
                  mimeType: doc.originalMimeType,
                  size: doc.originalFileSize,
                  similarity: doc.similarity,
                });
              }
            }

            executedTools.push({
              name,
              arguments: args,
              executed: true,
              result: {
                documentsFound: searchResult.results.length,
                files: searchResult.results.map((d) => ({
                  filename: d.filename,
                  mimeType: d.originalMimeType,
                  similarity: d.similarity,
                })),
              },
            });
          } catch (err) {
            console.warn("[test-agent] buscar_documento failed:", err);
            executedTools.push({
              name,
              arguments: args,
              executed: false,
              result: {
                error: err instanceof Error ? err.message : "search_failed",
              },
            });
          }
        } else {
          // Side-effect tools — show args but DO NOT execute
          executedTools.push({
            name: name || "unknown",
            arguments: args,
            executed: false,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      response: aiResponse.content,
      latencyMs,
      model: aiResponse.model,
      provider: aiResponse.provider,
      usage: aiResponse.usage,
      toolCalls: aiResponse.toolCalls || [],
      attachments,
      executedTools,
      meta: {
        historySource,
        historyMessageCount,
        ragEnabled: config.settings.enableRAG,
        ragChunkCount,
        ragChunks,
        toolsEnabled: config.settings.enableTools,
        toolCallNames: Array.isArray(aiResponse.toolCalls)
          ? aiResponse.toolCalls
              .map((tc: { function?: { name?: string } }) => tc?.function?.name)
              .filter((n): n is string => Boolean(n))
          : [],
        primaryProvider: config.primaryProvider,
        modelUsed:
          config.primaryProvider === "groq"
            ? config.models.groqModel
            : config.models.openaiModel,
      },
    });
  } catch (error) {
    console.error("[POST /api/agents/[id]/test] Error:", error);

    if (error instanceof Error) {
      const msg = error.message;
      if (
        msg.includes("API key configured in Vault") ||
        msg.includes("No GROQ") ||
        msg.includes("No OPENAI")
      ) {
        return NextResponse.json(
          {
            error:
              "Chave de API não configurada. Acesse Configurações → Modelo IA e cadastre sua chave.",
          },
          { status: 422 },
        );
      }
      if (
        msg.includes("API key") ||
        msg.includes("Incorrect API key") ||
        msg.includes("invalid_api_key")
      ) {
        return NextResponse.json(
          {
            error:
              "Chave de API inválida. Verifique Configurações → Modelo IA.",
          },
          { status: 401 },
        );
      }
      if (
        msg.includes("rate limit") ||
        msg.includes("quota") ||
        msg.includes("429")
      ) {
        return NextResponse.json(
          {
            error: "Limite de requisições atingido. Aguarde alguns segundos.",
          },
          { status: 429 },
        );
      }
      if (msg.includes("model") && msg.includes("not found")) {
        return NextResponse.json(
          {
            error:
              "Modelo não encontrado. Verifique o modelo selecionado no agente.",
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(
      {
        error:
          "Erro ao testar o agente. Tente novamente ou verifique as configurações.",
      },
      { status: 500 },
    );
  }
}
