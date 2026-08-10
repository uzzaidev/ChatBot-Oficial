import { z } from "zod";
import type { ClientConfig, ContactMetadata } from "./types";

export const CONTACT_METADATA_FIELDS = [
  "nome",
  "cpf",
  "email",
  "como_conheceu",
  "indicado_por",
  "objetivo",
  "experiencia",
  "periodo_preferido",
  "dia_preferido",
  "nome_completo",
  "data_nascimento",
  "rg",
  "cep",
  "endereco",
  "bairro",
  "cidade",
  "estado",
  "telefone_alternativo",
  "profissao",
] as const;

export const CONTACT_METADATA_FIELD_SET = new Set<string>(
  CONTACT_METADATA_FIELDS,
);

export type AgentToolName =
  | "transferir_atendimento"
  | "buscar_conhecimento"
  | "buscar_documento"
  | "enviar_resposta_em_audio"
  | "registrar_dado_cadastral"
  | "verificar_agenda"
  | "criar_evento_agenda"
  | "alterar_evento_agenda"
  | "cancelar_evento_agenda";

const checkSlotsAreFilled = (
  metadata: ContactMetadata | null | undefined,
  requiredSlots: string[],
): boolean => {
  if (!requiredSlots || requiredSlots.length === 0) return true;
  if (!metadata) return false;
  return requiredSlots.every(
    (slot) =>
      metadata[slot] !== undefined &&
      metadata[slot] !== null &&
      metadata[slot] !== "",
  );
};

export const shouldExposeCalendarTools = (
  config: ClientConfig,
  contactMetadata?: ContactMetadata,
): boolean => {
  const calendarSlotsOk =
    !config.agentV2?.requireSlotsForCalendar ||
    checkSlotsAreFilled(
      contactMetadata,
      config.agentV2?.calendarRequiredSlots ?? [],
    );

  return (
    config.calendar?.botEnabled !== false &&
    (config.calendar?.google?.enabled || config.calendar?.microsoft?.enabled) &&
    calendarSlotsOk
  );
};

export const buildAllowedTools = (input: {
  config: ClientConfig;
  contactMetadata?: ContactMetadata;
  enableTools?: boolean;
}): Record<string, any> | undefined => {
  const { config, contactMetadata, enableTools = true } = input;

  // `enableTools` here is a per-call override (e.g. follow-up calls pass
  // false to force a text-only reply) — it still fully disables every tool
  // for that one call. There is no per-agent master switch anymore: each
  // tool below is gated only by its own config.settings.enable* flag.
  if (!enableTools) {
    return undefined;
  }

  const tools: Record<string, any> = {};

  if (config.settings.enableHumanHandoff) {
    tools.transferir_atendimento = {
      description:
        "Use somente quando o usuario pedir explicitamente para falar com humano, atendente ou pessoa.",
      inputSchema: z.object({
        motivo: z
          .string()
          .describe("Motivo da transferencia solicitada pelo usuario."),
      }),
    };
  }

  // Only expose the on-demand search tool when RAG mode is "on_demand" —
  // in "always_inject" mode the context is already injected into every
  // prompt (see chatbotFlow.ts), so the tool would be redundant.
  if (config.settings.enableRAG && config.settings.ragMode === "on_demand") {
    tools.buscar_conhecimento = {
      description:
        "Busca trechos textuais na base de conhecimento do cliente. Use quando precisar de informacao factual da base antes de responder.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Pergunta ou termo de busca para a base de conhecimento."),
      }),
    };
  }

  if (config.settings.enableDocumentSearch) {
    tools.buscar_documento = {
      // Curta e concreta de proposito: modelos menores (gpt-5.4-mini) sao
      // sensiveis a descricao de tool — uma lista longa de sinonimos +
      // instrucao negativa embutida dilui o gatilho principal. A regra de
      // "nao invente/liste sem chamar" fica por ultimo, como aviso curto.
      description:
        "Envia um arquivo da base de conhecimento (imagem, foto, PDF, catalogo, tabela, documento) diretamente ao cliente pelo WhatsApp. Use sempre que o cliente pedir para ver, receber, mandar algo assim, ou reclamar que nao recebeu — mesmo sem saber o nome exato do arquivo, chame mesmo assim com o melhor termo de busca. Nunca invente nem liste nomes de arquivo/foto no texto sem chamar esta ferramenta.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Termo de busca extraido da solicitacao do usuario: nome do arquivo (se mencionado), assunto, produto ou tipo de material.",
          ),
        // NUNCA usar `.default(...)` aqui. OpenAI's function-calling schema
        // rejects/ignora `default` no JSON Schema (openai-node's zodFunction
        // helper trata como erro explicito: "'default' is not permitted").
        // Modelos mais novos (gpt-5.4-mini) parecem simplesmente evitar
        // chamar a tool quando o schema carrega essa keyword — nano tolerava,
        // 5.4-mini nao. "any"/omitido ja sao tratados como equivalentes no
        // codigo (resolveDocumentSearch), entao optional() sem default basta.
        document_type: z
          .enum(["any", "catalog", "manual", "faq", "image"])
          .optional()
          .describe("Tipo de documento. Use any ou omita na maioria dos casos."),
      }),
    };
  }

  if (config.settings.enableAudioResponse) {
    tools.enviar_resposta_em_audio = {
      description:
        "Converte a resposta final em audio. Use apenas quando a politica do agente ou o usuario pedirem audio.",
      inputSchema: z.object({
        texto_para_audio: z
          .string()
          .describe("Texto completo que sera convertido em audio."),
      }),
    };
  }

  if (config.settings.enableContactRegistration) {
    tools.registrar_dado_cadastral = {
      description:
        "Use quando o usuario fornecer dado cadastral. Salva os campos para nao perguntar novamente.",
      inputSchema: z
        .object({
          campo: z.enum(CONTACT_METADATA_FIELDS).optional(),
          valor: z.string().optional(),
          campos: z.record(z.string(), z.string()).optional(),
        })
        .refine(
          (payload) => {
            const hasSingleField =
              typeof payload.campo === "string" &&
              typeof payload.valor === "string" &&
              payload.valor.trim().length > 0;
            const hasMultiFields = Object.entries(payload.campos ?? {}).some(
              ([field, value]) =>
                CONTACT_METADATA_FIELD_SET.has(field) &&
                typeof value === "string" &&
                value.trim().length > 0,
            );
            return hasSingleField || hasMultiFields;
          },
          {
            message:
              "Informe campo + valor ou campos com pelo menos um campo valido.",
          },
        ),
    };
  }

  if (
    config.settings.enableCalendarTools &&
    shouldExposeCalendarTools(config, contactMetadata)
  ) {
    tools.verificar_agenda = {
      description:
        "Verifica disponibilidade na agenda sem revelar detalhes internos de compromissos.",
      inputSchema: z.object({
        tipo: z.enum(["horarios_livres", "eventos_existentes"]),
        data_inicio: z.string(),
        data_fim: z.string(),
      }),
    };

    tools.criar_evento_agenda = {
      description:
        "Cria evento somente apos confirmacao explicita do usuario para um horario definido.",
      inputSchema: z.object({
        titulo: z.string(),
        data_hora_inicio: z.string(),
        data_hora_fim: z.string(),
        descricao: z.string().optional(),
        email_participante: z.string().optional(),
      }),
    };

    tools.alterar_evento_agenda = {
      description:
        "Altera um evento existente quando o usuario quiser remarcar ou mudar horario.",
      inputSchema: z.object({
        event_id: z.string(),
        novo_titulo: z.string().optional(),
        nova_data_hora_inicio: z.string().optional(),
        nova_data_hora_fim: z.string().optional(),
      }),
    };

    tools.cancelar_evento_agenda = {
      description:
        "Cancela evento quando o usuario pedir cancelar, desmarcar ou remover compromisso.",
      inputSchema: z.object({
        event_id: z.string().optional(),
        event_ids: z.array(z.string()).optional(),
        titulo: z.string().optional(),
        data_inicio: z.string().optional(),
        data_fim: z.string().optional(),
      }),
    };
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
};

export const getAllowedToolNames = (input: {
  config: ClientConfig;
  contactMetadata?: ContactMetadata;
  enableTools?: boolean;
}): Set<string> => {
  return new Set(Object.keys(buildAllowedTools(input) ?? {}));
};
