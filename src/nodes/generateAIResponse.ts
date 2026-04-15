import { callDirectAI } from "@/lib/direct-ai-client";
import {
  AIResponse,
  ChatMessage,
  ClientConfig,
  ContactMetadata,
} from "@/lib/types";
import { checkBudgetAvailable } from "@/lib/unified-tracking";
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
      'Busca e envia documentos ou imagens da base de conhecimento. Use quando o usuário EXPLICITAMENTE solicitar um documento, manual, catálogo, imagem ou arquivo específico. Exemplos: "me envia o catálogo", "preciso do manual", "tem alguma imagem sobre isso", "pode me enviar o documento X". IMPORTANTE: Arquivos de texto (.txt, .md) não são enviados como anexo, mas o CONTEÚDO completo será retornado na mensagem para você usar nas respostas. NÃO use para perguntas gerais que você pode responder com texto.',
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
    description: `Converte sua resposta em mensagem de voz (áudio) ao invés de enviar como texto.

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

const CHECK_CALENDAR_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "verificar_agenda",
    description:
      'Verifica a disponibilidade na agenda do cliente (Google Calendar ou Microsoft Outlook). Use quando o usuário perguntar sobre horários disponíveis ou quiser saber se está livre em determinado período. IMPORTANTE: Por privacidade, NUNCA revele nomes, títulos, descrições ou detalhes de compromissos existentes. Apenas informe se o horário está livre ou ocupado, e sugira horários alternativos. Exemplos: "estou livre amanhã às 10h?", "quais horários disponíveis na sexta?", "tenho algo às 15h?".',
    parameters: {
      type: "object",
      properties: {
        tipo: {
          type: "string",
          description:
            "Tipo de verificação: 'horarios_livres' para checar disponibilidade ou 'eventos_existentes' para listar compromissos",
          enum: ["horarios_livres", "eventos_existentes"],
        },
        data_inicio: {
          type: "string",
          description:
            "Data/hora de início do período a verificar (formato ISO 8601, ex: 2025-03-10T09:00:00-03:00)",
        },
        data_fim: {
          type: "string",
          description:
            "Data/hora de fim do período a verificar (formato ISO 8601, ex: 2025-03-10T18:00:00-03:00)",
        },
      },
      required: ["tipo", "data_inicio", "data_fim"],
    },
  },
};

const CREATE_CALENDAR_EVENT_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "criar_evento_agenda",
    description:
      'Cria um novo evento na agenda do cliente. REGRA CRÍTICA: SÓ use esta tool após o usuário confirmar EXPLICITAMENTE que quer criar o evento — palavras como "marca", "cria", "pode agendar", "confirma", "sim" após você perguntar. NUNCA crie um evento quando o usuário estiver apenas mencionando opções, verificando disponibilidade, ou usando palavras de incerteza como "acho que", "precisaria confirmar", "me passou uma opção". O fluxo correto é: (1) verificar disponibilidade de todos os horários mencionados com verificar_agenda, (2) apresentar as opções disponíveis ao usuário, (3) perguntar "Posso criar o evento para [dia/horário]?", (4) aguardar confirmação explícita, (5) só então chamar esta tool. Antes de criar, verificar no historico se ja existe "[SISTEMA] Evento agendado" para este contato e evitar duplicidade.',
    parameters: {
      type: "object",
      properties: {
        titulo: {
          type: "string",
          description:
            "Título do evento (ex: 'Reunião com equipe', 'Consulta médica')",
        },
        data_hora_inicio: {
          type: "string",
          description:
            "Data/hora de início do evento (formato ISO 8601, ex: 2025-03-10T10:00:00-03:00)",
        },
        data_hora_fim: {
          type: "string",
          description:
            "Data/hora de fim do evento (formato ISO 8601, ex: 2025-03-10T11:00:00-03:00)",
        },
        descricao: {
          type: "string",
          description: "Descrição opcional do evento",
        },
        email_participante: {
          type: "string",
          description: "Email de um participante a convidar (opcional)",
        },
      },
      required: ["titulo", "data_hora_inicio", "data_hora_fim"],
    },
  },
};

const REGISTER_CONTACT_DATA_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "registrar_dado_cadastral",
    description:
      "Use quando o usuario fornecer dado cadastral. Salva o campo para nao perguntar novamente em conversas futuras.",
    parameters: {
      type: "object",
      properties: {
        campo: {
          type: "string",
          enum: ["cpf", "email", "como_conheceu", "indicado_por", "objetivo"],
          description: "Campo cadastral coletado na conversa.",
        },
        valor: {
          type: "string",
          description: "Valor informado pelo usuario para o campo.",
        },
      },
      required: ["campo", "valor"],
    },
  },
};

const RESCHEDULE_CALENDAR_EVENT_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "alterar_evento_agenda",
    description:
      'Altera (reagenda) um evento existente na agenda — muda data, horário ou título sem cancelar e recriar. Use quando o usuário quiser mudar o horário de um compromisso já agendado. Para encontrar o event_id: procure no histórico por "[SISTEMA] Evento agendado" — o ID está no final. Forneça apenas os campos que precisam mudar; os outros ficam como estão.',
    parameters: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description:
            "ID do evento a alterar. Encontre em mensagens '[SISTEMA] Evento agendado' no histórico.",
        },
        novo_titulo: {
          type: "string",
          description: "Novo título do evento (opcional — omita se não mudar)",
        },
        nova_data_hora_inicio: {
          type: "string",
          description: "Nova data/hora de início (ISO 8601, opcional)",
        },
        nova_data_hora_fim: {
          type: "string",
          description: "Nova data/hora de fim (ISO 8601, opcional)",
        },
      },
      required: ["event_id"],
    },
  },
};

const CANCEL_CALENDAR_EVENT_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "cancelar_evento_agenda",
    description:
      'Cancela/desmarca um evento existente da agenda. Use quando o usuário disser "cancelar", "desmarcar", "não posso mais", "não vou conseguir" ou qualquer variação que indique que não quer mais o compromisso. NUNCA chame criar_evento_agenda quando o usuário pedir cancelamento. Para localizar o evento: procure no histórico de conversa por mensagens "[SISTEMA] Evento agendado" — o event_id está no final dessas mensagens (ex: "ID: abc123"). Passe sempre o event_id quando disponível; caso contrário, passe titulo e data_inicio.',
    parameters: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description:
            "ID do evento na agenda. Encontre nas mensagens '[SISTEMA] Evento agendado' no histórico.",
        },
        titulo: {
          type: "string",
          description:
            "Título do evento para localizar e cancelar (quando não tiver event_id)",
        },
        data_inicio: {
          type: "string",
          description:
            "Data/hora de início para localizar o evento (ISO 8601). Pode ser o início exato ou apenas referência de data/hora.",
        },
        data_fim: {
          type: "string",
          description:
            "Data/hora de fim para localizar o evento (ISO 8601). Opcional.",
        },
      },
      required: [],
    },
  },
};

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

    // 🔧 Phase 1: Add continuity greeting instruction if provided
    if (greetingInstruction && greetingInstruction.trim().length > 0) {
      messages.push({
        role: "system",
        content: `IMPORTANTE - Contexto da conversa: ${greetingInstruction}`,
      });
    }

    if (contactMetadata && Object.keys(contactMetadata).length > 0) {
      const metaLines: string[] = [];
      if (contactMetadata.email) metaLines.push(`E-mail: ${contactMetadata.email}`);
      if (contactMetadata.cpf) metaLines.push(`CPF: ${contactMetadata.cpf}`);
      if (contactMetadata.como_conheceu) {
        metaLines.push(`Como conheceu: ${contactMetadata.como_conheceu}`);
      }
      if (contactMetadata.indicado_por) {
        metaLines.push(`Indicado por: ${contactMetadata.indicado_por}`);
      }
      if (contactMetadata.objetivo) {
        metaLines.push(`Objetivo declarado: ${contactMetadata.objetivo}`);
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

    // 📅 Calendar rules — injected whenever any calendar integration is active
    if (
      config.calendar?.google?.enabled ||
      config.calendar?.microsoft?.enabled
    ) {
      messages.push({
        role: "system",
        content: [
          "REGRAS OBRIGATÓRIAS DE CALENDÁRIO:",
          "1. NUNCA inclua nas mensagens ao usuário: número de WhatsApp do contato, e-mail de convidados, IDs de eventos ou qualquer dado interno. A confirmação de criação de evento deve conter APENAS o que o resultado da ferramenta retornar — título e data/horário.",
          "2. Quando o usuário pedir cancelamento (palavras: 'cancelar', 'desmarcar', 'não posso mais', 'não vou conseguir', 'cancela', 'remove'): use SEMPRE cancelar_evento_agenda. NUNCA chame criar_evento_agenda quando o usuário pedir cancelamento.",
          "3. Quando o usuário quiser mudar o horário de um evento já agendado (palavras: 'mudar', 'remarcar', 'reagendar', 'trocar o horário'): use alterar_evento_agenda — NÃO cancele e recrie.",
          "4. Para encontrar o event_id: procure no histórico de conversa por mensagens '[SISTEMA] Evento agendado' — o ID está no final (ex: 'ID: abc123'). Passe esse ID nas ferramentas cancelar_evento_agenda ou alterar_evento_agenda.",
          "5. Se criar_evento_agenda retornar 'Já existe um evento semelhante', NÃO tente criar novamente — informe o usuário que o evento já está na agenda.",
        ].join("\n"),
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

    // Log para debug

    // 🚀 Fast Track: Conditionally include tools
    const tools = enableTools
      ? [
          HUMAN_HANDOFF_TOOL_DEFINITION,
          SEARCH_DOCUMENT_TOOL_DEFINITION, // NEW: Buscar documentos da base de conhecimento
          TTS_AUDIO_TOOL_DEFINITION, // NEW: Enviar resposta em áudio (TTS)
          REGISTER_CONTACT_DATA_TOOL_DEFINITION, // NEW: Registrar dado cadastral
        ]
      : []; // Empty tools array for fast track

    // 💰 FASE 1: Budget Enforcement - Check before API call
    const budgetAvailable = await checkBudgetAvailable(config.id);
    if (!budgetAvailable) {
      throw new Error(
        "❌ Limite de budget atingido. Entre em contato com o suporte para aumentar seu limite.",
      );
    }

    // 🌐 SEMPRE usa callDirectAI() - credenciais diretas do Vault do cliente

    // Convert ChatMessage[] to CoreMessage[]
    const coreMessages: CoreMessage[] = messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

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
      tools:
        enableTools && config.settings.enableTools
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
                description:
                  SEARCH_DOCUMENT_TOOL_DEFINITION.function.description,
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
              registrar_dado_cadastral: {
                description:
                  REGISTER_CONTACT_DATA_TOOL_DEFINITION.function.description,
                inputSchema: z.object({
                  campo: z
                    .enum([
                      "cpf",
                      "email",
                      "como_conheceu",
                      "indicado_por",
                      "objetivo",
                    ])
                    .describe("Campo cadastral coletado na conversa."),
                  valor: z
                    .string()
                    .describe("Valor informado pelo usuário para o campo."),
                }),
              },
              ...(config.calendar?.google?.enabled ||
              config.calendar?.microsoft?.enabled
                ? {
                    verificar_agenda: {
                      description:
                        CHECK_CALENDAR_TOOL_DEFINITION.function.description,
                      inputSchema: z.object({
                        tipo: z
                          .enum(["horarios_livres", "eventos_existentes"])
                          .describe(
                            "Tipo de verificação: 'horarios_livres' para checar disponibilidade ou 'eventos_existentes' para listar compromissos",
                          ),
                        data_inicio: z
                          .string()
                          .describe(
                            "Data/hora de início do período a verificar (formato ISO 8601)",
                          ),
                        data_fim: z
                          .string()
                          .describe(
                            "Data/hora de fim do período a verificar (formato ISO 8601)",
                          ),
                      }),
                    },
                    criar_evento_agenda: {
                      description:
                        CREATE_CALENDAR_EVENT_TOOL_DEFINITION.function
                          .description,
                      inputSchema: z.object({
                        titulo: z.string().describe("Título do evento"),
                        data_hora_inicio: z
                          .string()
                          .describe(
                            "Data/hora de início do evento (formato ISO 8601)",
                          ),
                        data_hora_fim: z
                          .string()
                          .describe(
                            "Data/hora de fim do evento (formato ISO 8601)",
                          ),
                        descricao: z
                          .string()
                          .optional()
                          .describe("Descrição opcional do evento"),
                        email_participante: z
                          .string()
                          .optional()
                          .describe(
                            "Email de um participante a convidar (opcional)",
                          ),
                      }),
                    },
                    alterar_evento_agenda: {
                      description:
                        RESCHEDULE_CALENDAR_EVENT_TOOL_DEFINITION.function
                          .description,
                      inputSchema: z.object({
                        event_id: z
                          .string()
                          .describe(
                            "ID do evento a alterar. Encontre em '[SISTEMA] Evento agendado' no histórico.",
                          ),
                        novo_titulo: z
                          .string()
                          .optional()
                          .describe("Novo título do evento (omita se não mudar)"),
                        nova_data_hora_inicio: z
                          .string()
                          .optional()
                          .describe("Nova data/hora de início (ISO 8601, opcional)"),
                        nova_data_hora_fim: z
                          .string()
                          .optional()
                          .describe("Nova data/hora de fim (ISO 8601, opcional)"),
                      }),
                    },
                    cancelar_evento_agenda: {
                      description:
                        CANCEL_CALENDAR_EVENT_TOOL_DEFINITION.function
                          .description,
                      inputSchema: z.object({
                        event_id: z
                          .string()
                          .optional()
                          .describe(
                            "ID do evento na agenda (use quando ja tiver esse identificador)",
                          ),
                        titulo: z
                          .string()
                          .optional()
                          .describe(
                            "Titulo do evento para localizar e cancelar (quando nao tiver event_id)",
                          ),
                        data_inicio: z
                          .string()
                          .optional()
                          .describe(
                            "Data/hora de inicio para localizar o evento (formato ISO 8601)",
                          ),
                        data_fim: z
                          .string()
                          .optional()
                          .describe(
                            "Data/hora de fim para localizar o evento (formato ISO 8601, opcional)",
                          ),
                      }),
                    },
                  }
                : {}),
            }
          : undefined,
      settings: {
        temperature: config.settings.temperature,
        maxTokens: config.settings.maxTokens,
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
      wasCached: false, // No caching for direct calls
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
        cached_tokens: 0, // No caching for direct calls
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate AI response: ${errorMessage}`);
  }
};

