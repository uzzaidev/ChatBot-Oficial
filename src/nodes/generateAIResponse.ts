import { callDirectAI } from "@/lib/direct-ai-client";
import {
  buildAllowedTools,
  shouldExposeCalendarTools,
} from "@/lib/agent-tools";
import {
  DEFAULT_CONTEXT_BUDGETS,
  enforceInputBudget,
} from "@/lib/token-budget";
import {
  AIResponse,
  ChatMessage,
  ClientConfig,
  ContactMetadata,
} from "@/lib/types";
import { checkBudgetAvailable } from "@/lib/unified-tracking";
import type { CoreMessage } from "ai";

// 📝 PROMPT PADRÃO (fallback neutro para evitar vies de dominio entre tenants)
// Uses XML tags for section delimiters following OpenAI best practices for GPT-5.
const DEFAULT_SYSTEM_PROMPT = `<identity>
Voce e um assistente virtual da empresa no WhatsApp.
</identity>

<rules>
- Atenda com clareza, educacao e objetividade.
- Se faltar contexto, faca perguntas curtas para entender melhor a necessidade do cliente.
- Nao invente informacoes. Quando necessario, informe que vai confirmar os dados.
- Se o cliente pedir suporte humano, use a tool de transferencia.
- Nunca assuma nicho, produto ou servico especifico sem evidencias na conversa.
</rules>`;

// 📱 REGRAS DE FORMATO PARA WHATSAPP (estavel — fica no prefixo cacheavel)
// Modelos pequenos geram parrafos longos por default. Sem esta instrucao
// explicita, o usuario recebe blocos de 800+ chars que sao chatos de ler no
// celular. Repete a regra de forma direta — modelos pequenos respondem
// melhor a regras numeradas e curtas.
const WHATSAPP_FORMATTING_RULES = [
  "REGRAS DE FORMATO (WhatsApp):",
  "1. Responda em mensagens CURTAS. Cada mensagem deve ter no maximo ~280 caracteres.",
  "2. Para responder algo mais longo, quebre em multiplas mensagens separadas por uma linha em branco (\\n\\n entre elas). Cada bloco vira uma mensagem separada no WhatsApp.",
  "3. Nao use markdown (# ## ** __ ` ```). O WhatsApp nao renderiza — vai aparecer cru pro cliente.",
  "4. Evite listas numeradas longas. Quando precisar listar, use no maximo 3-4 itens curtos por mensagem.",
  "5. Tom: direto, humano, sem encheção. Sem 'espero ter ajudado', 'fico a disposicao' a cada mensagem.",
].join("\n");

export interface GenerateAIResponseInput {
  message: string;
  chatHistory: ChatMessage[];
  ragContext: string;
  customerName: string;
  contactMetadata?: ContactMetadata;
  config: ClientConfig; // 🔐 Config dinâmica do cliente
  greetingInstruction?: string; // 🔧 Phase 1: Continuity greeting instruction
  includeDateTimeInfo?: boolean; // 🚀 Fast Track: Whether to include date/time in prompt (default: true)
  enableTools?: boolean; // 🚀 Fast Track: Whether to enable tools (default: true)
  conversationId?: string; // ✨ FASE 8: Conversation ID for unified tracking
  phone?: string; // ✨ FASE 8: Phone number for analytics
  supportModeEnabled?: boolean;
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
      contactMetadata,
      config,
      greetingInstruction,
      includeDateTimeInfo = true, // 🚀 Fast Track: default to true for backward compatibility
      enableTools = true, // 🚀 Fast Track: default to true for backward compatibility
      conversationId,
      phone,
      supportModeEnabled = false,
    } = input;

    // Usar systemPrompt do cliente quando valido; fallback neutro quando ausente/vazio
    const configuredSystemPrompt = config.prompts.systemPrompt?.trim();
    const isUsingDefaultSystemPrompt = !configuredSystemPrompt;
    const systemPrompt = configuredSystemPrompt || DEFAULT_SYSTEM_PROMPT;

    if (isUsingDefaultSystemPrompt) {
      console.warn("[AI] Missing tenant system prompt; using neutral fallback", {
        clientId: config.id,
        clientName: config.name,
      });
    }

    // 💡 ORDEM DO PROMPT PARA CACHE OPENAI:
    // OpenAI faz cache automatico de prefixos >=1024 tokens. O cache so casa
    // na sequencia EXATA de tokens iniciais. Conteudo estavel vai primeiro;
    // conteudo variavel por chamada (dateTime, greeting, RAG) vai por ultimo
    // entre os system messages. Resultado: a partir da 2a mensagem da mesma
    // conversa, ~70-80% do input vira cached (50% de desconto).
    const messages: ChatMessage[] = [
      // 1. Prompt do tenant (estavel por cliente)
      {
        role: "system",
        content: systemPrompt,
      },
      // 2. Regras de WhatsApp (estavel — global)
      {
        role: "system",
        content: WHATSAPP_FORMATTING_RULES,
      },
    ];

    if (enableTools && config.settings.enableTools) {
      messages.push({
        role: "system",
        content: [
          "REGRA CRITICA DE TOOLS:",
          "JAMAIS escreva JSON, objetos {\"campo\":\"valor\"}, ou descreva a chamada de uma tool no texto da resposta. Tools sao invocadas exclusivamente pelo canal de tool_calls do modelo, nunca como conteudo enviado ao usuario.",
          "Nao narre a acao da tool (ex: \"Transferindo para atendimento humano...\", \"Buscando documento...\", \"Registrando seus dados...\"). A confirmacao para o usuario e gerada pelo sistema apos a tool executar.",
          "Se decidir chamar uma tool, faca a chamada e responda ao usuario apenas com texto natural sem qualquer estrutura JSON.",
        ].join("\n"),
      });

      // 🚫 REGRA OBRIGATORIA DE CADASTRO removida do prompt do agente principal
      // (encharcava o system prompt com 8 linhas + lista de 20 campos toda mensagem).
      // A guidance de coleta agora vive APENAS na `description` da tool
      // `registrar_dado_cadastral` em src/lib/agent-tools.ts — o LLM continua
      // recebendo essa instrucao via canal de tools, sem inflar o prompt.
    }

    if (supportModeEnabled) {
      messages.push({
        role: "system",
        content: [
          "MODO SUPORTE ATIVO:",
          "- Quando o cliente reportar bug/erro/falha, priorize coleta objetiva de contexto (o que tentou, quando falhou, impacto).",
          "- Não invente causa técnica sem evidência.",
          "- Se necessário, diga que o caso será triado pelo time técnico.",
        ].join("\n"),
      });
    }

    if (contactMetadata && Object.keys(contactMetadata).length > 0) {
      const metaLines: string[] = [];
      if (contactMetadata.nome) metaLines.push(`Nome: ${contactMetadata.nome}`);
      if (contactMetadata.email) metaLines.push(`E-mail: ${contactMetadata.email}`);
      if (contactMetadata.cpf) metaLines.push(`CPF: ${contactMetadata.cpf}`);
      if (contactMetadata.nome_completo) {
        metaLines.push(`Nome completo: ${contactMetadata.nome_completo}`);
      }
      if (contactMetadata.data_nascimento) {
        metaLines.push(`Data de nascimento: ${contactMetadata.data_nascimento}`);
      }
      if (contactMetadata.rg) metaLines.push(`RG: ${contactMetadata.rg}`);
      if (contactMetadata.cep) metaLines.push(`CEP: ${contactMetadata.cep}`);
      if (contactMetadata.endereco) {
        metaLines.push(`Endereco: ${contactMetadata.endereco}`);
      }
      if (contactMetadata.bairro) metaLines.push(`Bairro: ${contactMetadata.bairro}`);
      if (contactMetadata.cidade) metaLines.push(`Cidade: ${contactMetadata.cidade}`);
      if (contactMetadata.estado) metaLines.push(`Estado: ${contactMetadata.estado}`);
      if (contactMetadata.telefone_alternativo) {
        metaLines.push(
          `Telefone alternativo: ${contactMetadata.telefone_alternativo}`,
        );
      }
      if (contactMetadata.profissao) {
        metaLines.push(`Profissao: ${contactMetadata.profissao}`);
      }
      if (contactMetadata.como_conheceu) {
        metaLines.push(`Como conheceu: ${contactMetadata.como_conheceu}`);
      }
      if (contactMetadata.indicado_por) {
        metaLines.push(`Indicado por: ${contactMetadata.indicado_por}`);
      }
      if (contactMetadata.objetivo) {
        metaLines.push(`Objetivo declarado: ${contactMetadata.objetivo}`);
      }
      if (contactMetadata.experiencia) {
        metaLines.push(`Experiencia com yoga: ${contactMetadata.experiencia}`);
      }
      if (contactMetadata.experiencia_yoga) {
        metaLines.push(
          `Experiencia com yoga (legado): ${contactMetadata.experiencia_yoga}`,
        );
      }
      if (contactMetadata.periodo_preferido) {
        metaLines.push(
          `Periodo preferido: ${contactMetadata.periodo_preferido}`,
        );
      }
      if (contactMetadata.dia_preferido) {
        metaLines.push(`Dia preferido: ${contactMetadata.dia_preferido}`);
      }

      if (metaLines.length > 0) {
        messages.push({
          role: "system",
          content:
            "DADOS JÁ COLETADOS DESTE CONTATO - NÃO pergunte novamente:\n" +
            metaLines.join("\n"),
        });
      }
    }

    // V2: calendar tools exposed only when slots are filled (opt-in via agentV2.requireSlotsForCalendar)
    const calendarToolsAllowed = shouldExposeCalendarTools(
      config,
      contactMetadata,
    );

    // 📅 Calendar rules — injected only when calendar is connected AND bot is enabled AND slots ok
    if (
      config.calendar?.botEnabled !== false &&
      (config.calendar?.google?.enabled || config.calendar?.microsoft?.enabled) &&
      calendarToolsAllowed
    ) {
      messages.push({
        role: "system",
        content: [
          "REGRAS OBRIGATÓRIAS DE CALENDÁRIO:",
          "1. NUNCA inclua nas mensagens ao usuário: número de WhatsApp do contato, e-mail de convidados, IDs de eventos ou qualquer dado interno. A confirmação de criação de evento deve conter APENAS o que o resultado da ferramenta retornar — título e data/horário.",
          "2. Quando o usuário pedir cancelamento (palavras: 'cancelar', 'desmarcar', 'não posso mais', 'não vou conseguir', 'cancela', 'remove'): use SEMPRE cancelar_evento_agenda. NUNCA chame criar_evento_agenda quando o usuário pedir cancelamento. Se a ferramenta retornar uma lista numerada com [IDs: 1=xxx, 2=yyy], aguarde o usuário dizer os números (ex: '1, 2') ou 'todos', então chame cancelar_evento_agenda novamente com event_ids contendo os IDs correspondentes.",
          "3. Quando o usuário quiser mudar o horário de um evento já agendado (palavras: 'mudar', 'remarcar', 'reagendar', 'trocar o horário'): use alterar_evento_agenda — NÃO cancele e recrie.",
          "4. Para encontrar o event_id: procure no histórico de conversa por mensagens '[SISTEMA] Evento agendado' — o ID está no final (ex: 'ID: abc123'). Passe esse ID nas ferramentas cancelar_evento_agenda ou alterar_evento_agenda.",
          "5. Se criar_evento_agenda retornar 'Já existe um evento semelhante', NÃO tente criar novamente — informe o usuário que o evento já está na agenda.",
        ].join("\n"),
      });
    }

    // 🔧 Phase 1: Continuity greeting instruction (varia por sessao — pos
    // cache-break aceitavel)
    if (greetingInstruction && greetingInstruction.trim().length > 0) {
      messages.push({
        role: "system",
        content: `IMPORTANTE - Contexto da conversa: ${greetingInstruction}`,
      });
    }

    // 🕒 Data e hora atual (varia por chamada — vai por ULTIMO no bloco de
    // systems para nao quebrar o prefixo cacheavel. Posicionado aqui de
    // proposito: tudo acima dele eh estavel entre chamadas da mesma conversa.)
    if (includeDateTimeInfo) {
      const now = new Date();
      const dateTimeInfo = `Data e hora atual: ${now.toLocaleDateString(
        "pt-BR",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        },
      )} (horário de Brasília)`;

      messages.push({
        role: "system",
        content: dateTimeInfo,
      });
    }

    // RAG/knowledge context is added after token budgeting as a system context
    // block, never as a user message.

    // Valida e adiciona chatHistory - VALIDAÇÃO EXTRA
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const validHistory = chatHistory.filter((msg) => {
        const isValid =
          msg &&
          typeof msg === "object" &&
          (msg.role === "user" ||
            msg.role === "assistant" ||
            msg.role === "system") &&
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
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      throw new Error("Message must be a non-empty string");
    }

    messages.push({
      role: "user",
      content: `${customerName}: ${message}`,
    });

    // 💰 FASE 1: Budget Enforcement - Check before API call
    const budgetAvailable = await checkBudgetAvailable(config.id);
    if (!budgetAvailable) {
      throw new Error(
        "❌ Limite de budget atingido. Entre em contato com o suporte para aumentar seu limite.",
      );
    }

    // 🌐 SEMPRE usa callDirectAI() - credenciais diretas do Vault do cliente
    const currentUserMessage = messages[messages.length - 1] as ChatMessage;
    const priorMessages = messages.slice(0, -1);
    const budgetedContext = enforceInputBudget({
      systemMessages: priorMessages.filter((msg) => msg.role === "system"),
      historyMessages: priorMessages.filter((msg) => msg.role !== "system"),
      knowledgeContext: ragContext || "",
      currentUserMessage,
      limits: {
        maxInputTokens:
          config.settings.maxInputTokens ?? DEFAULT_CONTEXT_BUDGETS.maxInputTokens,
        maxHistoryTokens:
          config.settings.maxHistoryTokens ??
          DEFAULT_CONTEXT_BUDGETS.maxHistoryTokens,
        maxKnowledgeTokens:
          config.settings.maxKnowledgeTokens ??
          DEFAULT_CONTEXT_BUDGETS.maxKnowledgeTokens,
      },
    });

    const finalMessages: ChatMessage[] = [...budgetedContext.systemMessages];
    const hasKnowledgeContext =
      budgetedContext.knowledgeContext.trim().length > 0;

    if (hasKnowledgeContext) {
      // ⚠️ Bloco de conhecimento — usar regras NEGATIVAS explicitas.
      // Modelos pequenos (gpt-5.x-nano) reincidem em copiar chunks verbatim
      // quando a instrucao eh positiva e vaga ("use como referencia"). Regras
      // negativas concretas ("NUNCA cole texto literal") funcionam muito
      // melhor. Sem headers tipo "[Documento N]" — ja stripado em getRAGContext.
      finalMessages.push({
        role: "system",
        content: [
          "INFORMACAO INTERNA (NAO mostre este bloco ao cliente, apenas use para responder):",
          "",
          "<knowledge_context>",
          budgetedContext.knowledgeContext,
          "</knowledge_context>",
          "",
          "REGRAS DE USO DO BLOCO ACIMA:",
          "1. NUNCA copie texto literal do bloco. SEMPRE reformule com suas palavras de forma natural.",
          "2. NUNCA cole o conteudo inteiro de um item/documento na resposta. Resuma o que o cliente perguntou.",
          "3. Se o cliente quiser receber um documento/arquivo, NAO cole o conteudo: use a tool buscar_documento.",
          "4. NUNCA invente links, URLs, fotos ou anexos. Se a info nao esta no bloco, diga que vai confirmar.",
          "5. Se o bloco NAO responde a pergunta do cliente, diga isso de forma natural — nao tente forçar uma resposta a partir de info irrelevante.",
        ].join("\n"),
      });
    }
    finalMessages.push(...budgetedContext.historyMessages, currentUserMessage);

    const allowedTools = buildAllowedTools({
      config,
      contactMetadata,
      enableTools,
    });

    console.log("[AI] Context budget", {
      clientId: config.id,
      ...budgetedContext.stats,
      toolNames: Object.keys(allowedTools ?? {}),
    });

    // Convert ChatMessage[] to CoreMessage[]
    const coreMessages: CoreMessage[] = finalMessages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    // 🧠 Reasoning effort: quando ha RAG, sintetizar a resposta exige mais
    // raciocinio (escolher o que importa do bloco, reformular sem copiar,
    // detectar irrelevancia). Bumpa "low" → "medium" automaticamente nesses
    // casos. Se o tenant ja configurou medium/high/xhigh, respeita.
    const configuredEffort = config.settings.reasoningEffort;
    const ragRequiresMoreReasoning =
      hasKnowledgeContext &&
      (configuredEffort === undefined ||
        configuredEffort === "none" ||
        configuredEffort === "minimal" ||
        configuredEffort === "low");
    const effectiveReasoningEffort = ragRequiresMoreReasoning
      ? "medium"
      : configuredEffort;

    // Call AI - Direct SDK with Vault credentials
    const result = await callDirectAI({
      clientId: config.id,
      clientConfig: {
        id: config.id,
        name: config.name,
        primaryModelProvider: config.primaryProvider,
        openaiModel: config.models.openaiModel,
        groqModel: config.models.groqModel,
      },
      messages: coreMessages,
      tools: allowedTools,
      settings: {
        temperature: config.settings.temperature,
        maxTokens: config.settings.maxTokens,
        reasoningEffort: effectiveReasoningEffort,
      },
      conversationId,
      phone,
      metadata: {
        contextBudget: budgetedContext.stats,
        toolNames: Object.keys(allowedTools ?? {}),
      },
    });

    // 🔍 Log response summary
    const toolCallNames =
      result.toolCalls?.map((tc: any) => tc.function.name).join(",") || "";
    console.log(
      `🤖 [AI] ${config.name}: model=${result.model}, ${
        result.latencyMs
      }ms, content=${result.text?.length || 0}chars${
        toolCallNames ? `, tools=[${toolCallNames}]` : ""
      }`,
    );

    // Convert back to AIResponse format
    return {
      content: result.text,
      toolCalls: result.toolCalls,
      finished:
        result.finishReason === "stop" || result.finishReason === "end_turn",
      model: result.model,
      provider: result.provider as any,
      requestId: undefined, // No request ID for direct calls
      wasCached: (result.usage.cachedInputTokens ?? 0) > 0,
      wasFallback: false, // No fallback - direct calls only
      fallbackReason: undefined,
      primaryAttemptedProvider: result.provider as any,
      primaryAttemptedModel: result.model,
      fallbackUsedProvider: undefined,
      fallbackUsedModel: undefined,
      usage: {
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        total_tokens: result.usage.totalTokens,
        cached_tokens: result.usage.cachedInputTokens ?? 0,
        reasoning_tokens: result.usage.reasoningTokens,
      },
      reasoning: result.reasoning,
      requestPayload: result.requestSnapshot,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate AI response: ${errorMessage}`);
  }
};
