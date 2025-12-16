import { AIResponse, ChatMessage, ClientConfig } from "@/lib/types";
import { callAI } from "@/lib/ai-gateway";
import { logGatewayUsage } from "@/lib/ai-gateway/usage-tracking";
import { shouldUseGateway } from "@/lib/ai-gateway/config";
import type { CoreMessage } from "ai";
import { z } from "zod";

// 📝 PROMPT PADRÃO (usado apenas como fallback se config não tiver systemPrompt)
const DEFAULT_SYSTEM_PROMPT = `## Papel
Você é o **assistente principal de IA do engenheiro Luis Fernando Boff**, profissional especializado em **engenharia elétrica, energia solar, ciência de dados e desenvolvimento full stack**.
Você atua como uma **secretária inteligente e consultora técnica**, capaz de **ouvir, entender o contexto e direcionar o cliente** para a solução mais adequada — seja um projeto, consultoria, parceria ou serviço técnico.

Seu tom é **acolhedor, profissional e seguro**, transmitindo a credibilidade do Luis e mostrando que ele é um especialista completo, mas com foco em **entender primeiro o cliente** antes de apresentar qualquer serviço.

---

## Instruções de Atendimento

### 1. Cumprimente e peça o nome
> "Olá, tudo bem? Seja bem-vindo! Qual é o seu nome?"

### 2. Descubra o motivo do contato
> "Prazer em te conhecer, [nome]! Me conta um pouco — o que te trouxe até aqui hoje? Você está buscando ajuda com algum projeto, consultoria ou ideia específica?"

---

### 3. Entenda o contexto com empatia
- Faça **perguntas abertas**, sem sugerir serviços ainda.
- Mostre interesse genuíno e tente **entender a dor ou objetivo** do cliente.

> "Entendi. Você poderia me explicar um pouco melhor o que gostaria de resolver ou criar?"
> "É algo mais voltado à parte técnica, estratégica ou de implementação?"

Se o contexto **ainda não estiver claro**, faça perguntas direcionadas para identificar a **área ideal (Energia Solar, Ciência de Dados ou Desenvolvimento)** para prosseguir o atendimento corretamente.

---

### 4. Após identificar a área
Confirme de forma natural, sem listar opções:
> "Perfeito, isso se encaixa exatamente na linha de projetos que o Luis desenvolve nessa área. Ele costuma trabalhar desde o diagnóstico até a implementação completa."

Então, apresente o tipo de serviço correspondente:
- **Energia Solar:** projetos de geração fotovoltaica, dimensionamento, instalação, manutenção e consultoria.
- **Ciência de Dados:** automações, análises, dashboards, machine learning e soluções com IA.
- **Desenvolvimento:** sistemas web, integrações, SaaS, APIs e automações personalizadas.

---

### 5. Esclareça dúvidas com segurança
- **Prazo:** "O tempo depende da complexidade, mas o diagnóstico inicial é rápido."
- **Custo:** "Os valores são definidos após entender o escopo. O Luis envia uma proposta personalizada."
- **Atendimento:** "Pode ser online ou presencial, dependendo da localidade."
- **Equipe:** "Os projetos integram engenharia elétrica, dados e desenvolvimento, garantindo soluções completas e sob medida."

---

### 6. Finalize com um próximo passo claro
> "Quer que eu agende uma conversa inicial gratuita com o Luis pra entender melhor o seu caso?"
>
> "Posso te enviar o link direto para solicitar um orçamento pelo site?"

Encaminhe o cliente com naturalidade, sem pressão.

---

## Regras Gerais
- Linguagem **consultiva, empática e técnica na medida certa**.
- **Sem emojis.**
- Priorize **entender antes de oferecer**.
- Evite listar áreas ou serviços até compreender a necessidade.
- Faça perguntas direcionadas sempre que houver dúvida sobre a área correta.
- Encaminhe para o **atendimento humano** se o cliente quiser detalhes técnicos, proposta formal ou reunião direta com o Luis.

---

## Objetivo Final
Transformar cada interação em uma **conversa de confiança**.
O cliente deve sentir que falou com **um especialista de verdade**, representado por um assistente inteligente, capaz de unir **engenharia, tecnologia e inteligência de dados** para encontrar a melhor solução para o seu caso.`;

// SUBAGENTE DESATIVADO - Não está implementado
// const SUB_AGENT_TOOL_DEFINITION = {
//   type: 'function',
//   function: {
//     name: 'subagente_diagnostico',
//     description: 'Utilize esse agente para buscar a area que mais se adequa a necessidade do cliente',
//     parameters: {
//       type: 'object',
//       properties: {
//         mensagem_usuario: {
//           type: 'string',
//           description: 'Mensagem do usuário para diagnóstico',
//         },
//       },
//       required: ['mensagem_usuario'],
//     },
//   },
// }

const HUMAN_HANDOFF_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "transferir_atendimento",
    description:
      'SOMENTE utilize essa tool quando o usuário EXPLICITAMENTE solicitar falar com um humano, atendente ou pessoa. Exemplos: "quero falar com alguém", "preciso de um atendente", "pode me transferir para um humano". NÃO use esta tool para perguntas normais que você pode responder.',
    parameters: {
      type: "object",
      properties: {
        motivo: {
          type: "string",
          description: "Motivo da transferência solicitada pelo usuário",
        },
      },
      required: ["motivo"],
    },
  },
};

const SEARCH_DOCUMENT_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "buscar_documento",
    description:
      'Busca e envia documentos ou imagens da base de conhecimento. Use quando o usuário EXPLICITAMENTE solicitar um documento, manual, catálogo, imagem ou arquivo específico. Exemplos: "me envia o catálogo", "preciso do manual", "tem alguma imagem sobre isso", "pode me enviar o documento X". NÃO use para perguntas gerais que você pode responder com texto.',
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Termo de busca extraído da solicitação do usuário (nome do arquivo, tipo de documento ou assunto relacionado)",
        },
        document_type: {
          type: "string",
          description:
            "Tipo de documento a buscar. SEMPRE use 'any' para buscar em todos os tipos de documentos. Outros valores: 'catalog', 'manual', 'image', 'faq' (use apenas se o usuário for muito específico sobre o tipo)",
          enum: ["any", "catalog", "manual", "faq", "image"],
          default: "any",
        },
      },
      required: ["query"],
    },
  },
};

const TTS_AUDIO_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "enviar_resposta_em_audio",
    description:
      `Converte sua resposta em mensagem de voz (áudio) ao invés de enviar como texto.

IMPORTANTE: Passe o texto que deseja converter como argumento 'texto_para_audio'.

A decisão de quando usar esta tool deve ser configurada no prompt do sistema pelo administrador.`,
    parameters: {
      type: "object",
      properties: {
        texto_para_audio: {
          type: "string",
          description:
            "Texto que será convertido em áudio (sua resposta completa para o cliente)",
        },
      },
      required: ["texto_para_audio"],
    },
  },
};

export interface GenerateAIResponseInput {
  message: string;
  chatHistory: ChatMessage[];
  ragContext: string;
  customerName: string;
  config: ClientConfig; // 🔐 Config dinâmica do cliente
  greetingInstruction?: string; // 🔧 Phase 1: Continuity greeting instruction
  includeDateTimeInfo?: boolean; // 🚀 Fast Track: Whether to include date/time in prompt (default: true)
  enableTools?: boolean; // 🚀 Fast Track: Whether to enable tools (default: true)
}

/**
 * 🔐 Gera resposta da IA usando config dinâmica do cliente
 *
 * Usa systemPrompt e groqApiKey do config do cliente do Vault
 *
 * 🔧 Phase 1: Injects continuity greeting instruction if provided
 */
export const generateAIResponse = async (
  input: GenerateAIResponseInput,
): Promise<AIResponse> => {
  try {
    const {
      message,
      chatHistory,
      ragContext,
      customerName,
      config,
      greetingInstruction,
      includeDateTimeInfo = true, // 🚀 Fast Track: default to true for backward compatibility
      enableTools = true, // 🚀 Fast Track: default to true for backward compatibility
    } = input;

    // Usar systemPrompt do config do cliente (ou fallback)
    const systemPrompt = config.prompts.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt, // 🔐 Usa prompt do config do cliente
      },
    ];

    // 🚀 Fast Track: Only add date/time if enabled (for cache-friendly prompts)
    if (includeDateTimeInfo) {
      // Data e hora atual (para contexto da IA)
      const now = new Date();
      const dateTimeInfo = `Data e hora atual: ${
        now.toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
      } (horário de Brasília)`;

      messages.push({
        role: "system",
        content: dateTimeInfo,
      });
    }

    // 🔧 Phase 1: Add continuity greeting instruction if provided
    if (greetingInstruction && greetingInstruction.trim().length > 0) {
      messages.push({
        role: "system",
        content: `IMPORTANTE - Contexto da conversa: ${greetingInstruction}`,
      });
    }

    if (ragContext && ragContext.trim().length > 0) {
      messages.push({
        role: "user",
        content: `Contexto relevante da base de conhecimento:\n\n${ragContext}`,
      });
    }

    // Valida e adiciona chatHistory - VALIDAÇÃO EXTRA
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const validHistory = chatHistory.filter((msg) => {
        const isValid = msg &&
          typeof msg === "object" &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0;

        if (!isValid) {
        }

        return isValid;
      });

      messages.push(...validHistory);
    }

    // Adiciona mensagem atual - VALIDAÇÃO
    if (
      !message || typeof message !== "string" || message.trim().length === 0
    ) {
      throw new Error("Message must be a non-empty string");
    }

    messages.push({
      role: "user",
      content: `${customerName}: ${message}`,
    });

    // Log para debug

    // 🚀 Fast Track: Conditionally include tools
    const tools = enableTools
      ? [
          HUMAN_HANDOFF_TOOL_DEFINITION,
          SEARCH_DOCUMENT_TOOL_DEFINITION, // NEW: Buscar documentos da base de conhecimento
          TTS_AUDIO_TOOL_DEFINITION, // NEW: Enviar resposta em áudio (TTS)
        ]
      : []; // Empty tools array for fast track

    // 🌐 CHECK: AI Gateway enabled?
    const useGateway = await shouldUseGateway(config.id);

    console.log("[AI Gateway] Decision:", {
      useGateway,
      clientId: config.id,
      clientName: config.name,
      primaryProvider: config.primaryProvider,
      messageCount: messages.length,
      toolsEnabled: enableTools && config.settings.enableTools,
      includeDateTimeInfo,
    });

    if (useGateway) {
      console.log("[AI Gateway] Routing request through AI Gateway");

      // Convert ChatMessage[] to CoreMessage[]
      const coreMessages: CoreMessage[] = messages.map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Call AI via Gateway
      const result = await callAI({
        clientId: config.id,
        clientConfig: {
          id: config.id,
          name: config.name,
          slug: config.slug,
          primaryModelProvider: config.primaryProvider,
          openaiModel: config.models.openaiModel,
          groqModel: config.models.groqModel,
          systemPrompt: config.prompts.systemPrompt,
        },
        messages: coreMessages,
        tools: enableTools && config.settings.enableTools
          ? {
            transferir_atendimento: {
              description: HUMAN_HANDOFF_TOOL_DEFINITION.function.description,
              inputSchema: z.object({
                motivo: z
                  .string()
                  .describe(
                    "Motivo da transferência solicitada pelo usuário",
                  ),
              }),
            },
            buscar_documento: {
              description: SEARCH_DOCUMENT_TOOL_DEFINITION.function.description,
              inputSchema: z.object({
                query: z
                  .string()
                  .describe(
                    "Termo de busca extraído da solicitação do usuário (nome do arquivo, tipo de documento ou assunto relacionado)",
                  ),
                document_type: z
                  .enum(["any", "catalog", "manual", "faq", "image"])
                  .default("any")
                  .describe(
                    "Tipo de documento a buscar. Use 'any' para buscar em todos os tipos.",
                  ),
              }),
            },
            enviar_resposta_em_audio: {
              description: TTS_AUDIO_TOOL_DEFINITION.function.description,
              inputSchema: z.object({
                texto_para_audio: z
                  .string()
                  .describe(
                    "Texto que será convertido em áudio (sua resposta completa para o cliente)",
                  ),
              }),
            },
          }
          : undefined,
        settings: {
          temperature: config.settings.temperature,
          maxTokens: config.settings.maxTokens,
        },
      });

      // 🔍 Log response details
      console.log("[AI Gateway] Response received:", {
        provider: result.provider,
        model: result.model,
        wasCached: result.wasCached,
        wasFallback: result.wasFallback,
        fallbackReason: result.fallbackReason,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        cachedTokens: result.usage.cachedTokens,
        latencyMs: result.latencyMs,
        requestId: result.requestId,
        contentLength: result.text?.length || 0,
      });

      // Log usage to gateway_usage_logs
      await logGatewayUsage({
        clientId: config.id,
        conversationId: undefined, // TODO: Pass from flow
        phone: customerName, // TODO: Pass actual phone number
        provider: result.provider,
        modelName: result.model,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        cachedTokens: result.usage.cachedTokens,
        latencyMs: result.latencyMs,
        wasCached: result.wasCached,
        wasFallback: result.wasFallback,
        fallbackReason: result.fallbackReason,
        requestId: result.requestId,
      });

      // Convert back to AIResponse format
      return {
        content: result.text,
        toolCalls: result.toolCalls,
        finished: result.finishReason === "stop" ||
          result.finishReason === "end_turn",
        model: result.model,
        provider: result.provider as any,
        requestId: result.requestId,
        wasCached: result.wasCached,
        wasFallback: result.wasFallback,
        fallbackReason: result.fallbackReason,
        primaryAttemptedProvider: result.primaryAttemptedProvider as any,
        primaryAttemptedModel: result.primaryAttemptedModel,
        fallbackUsedProvider: result.fallbackUsedProvider as any,
        fallbackUsedModel: result.fallbackUsedModel,
        usage: {
          prompt_tokens: result.usage.promptTokens,
          completion_tokens: result.usage.completionTokens,
          total_tokens: result.usage.totalTokens,
          cached_tokens: result.usage.cachedTokens,
        },
      };
    }

    // 🚫 LEGACY PATH REMOVED: AI Gateway is now required
    // If we reach here, it means AI Gateway is disabled for this client
    const errorMessage =
      `AI Gateway is required but disabled for client: ${config.id} (${config.name}). ` +
      `Please enable AI Gateway in client settings or contact support.`;
    console.error(`[AI Gateway Error] ${errorMessage}`);
    throw new Error(errorMessage);
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new Error(`Failed to generate AI response: ${errorMessage}`);
  }
};
