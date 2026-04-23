import { callDirectAI } from "@/lib/direct-ai-client";
import type { ContactMetadata } from "@/lib/types";
import { updateContactMetadata } from "@/nodes/updateContactMetadata";

const FALLBACK_FIELDS = [
  "nome_completo",
  "cpf",
  "email",
  "data_nascimento",
  "endereco",
  "cep",
  "cidade",
  "estado",
  "rg",
  "telefone_alternativo",
  "profissao",
  "como_conheceu",
  "indicado_por",
  "objetivo",
  "experiencia",
  "periodo_preferido",
  "dia_preferido",
  "bairro",
] as const;

type FallbackField = (typeof FALLBACK_FIELDS)[number];

const FALLBACK_FIELD_SET = new Set<string>(FALLBACK_FIELDS);

const FIELD_ALIASES: Record<string, FallbackField> = {
  nome: "nome_completo",
  nome_cliente: "nome_completo",
  full_name: "nome_completo",
  birth_date: "data_nascimento",
  data_de_nascimento: "data_nascimento",
  date_of_birth: "data_nascimento",
  phone: "telefone_alternativo",
  telefone: "telefone_alternativo",
  celular: "telefone_alternativo",
  occupation: "profissao",
  zip_code: "cep",
  zipcode: "cep",
  address: "endereco",
  experiencia_previa: "experiencia",
  yoga_experience: "experiencia",
  periodo: "periodo_preferido",
  turno: "periodo_preferido",
  dia: "dia_preferido",
};

export interface ExtractContactDataFallbackInput {
  clientId: string;
  phone: string;
  userMessage: string;
  agentResponse?: string;
  existingMetadata?: ContactMetadata | null;
}

export interface ExtractContactDataFallbackResult {
  attempted: boolean;
  extracted: Record<string, string>;
  saved: Record<string, string | boolean>;
  rejected: Array<{ field: string; reason: string }>;
  persisted: boolean;
  error?: string;
}

const normalizeFieldKey = (field: string): string => {
  const normalized = field
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return FIELD_ALIASES[normalized] ?? normalized;
};

const extractJsonObject = (
  raw: string,
): Record<string, unknown> | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;

    try {
      return JSON.parse(trimmed.slice(first, last + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      return null;
    }
  }
};

const buildSystemPrompt = (): string =>
  [
    "Voce extrai dados cadastrais de mensagens de WhatsApp.",
    "Retorne APENAS JSON valido, sem markdown e sem texto fora do JSON.",
    "Nao invente dados. So extraia o que estiver explicito na mensagem do usuario.",
    `Use apenas estes campos: ${FALLBACK_FIELDS.join(", ")}.`,
    "Formato obrigatorio:",
    '{"dados":{"campo":"valor"},"confidence":0.0}',
    "Use 'experiencia' para experiencia com yoga (ex: nunca praticou, ja praticou, pratica atualmente).",
    "Use 'periodo_preferido' para manha/tarde/noite.",
    "Use 'dia_preferido' para dia especifico (segunda, terca, sexta etc).",
    "Se nao houver dados cadastrais, retorne exatamente:",
    '{"dados":{},"confidence":0.0}',
  ].join("\n");

const buildUserPrompt = (input: ExtractContactDataFallbackInput): string => {
  const existing = input.existingMetadata ?? {};
  const existingLines = Object.entries(existing)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);

  return [
    "Mensagem do usuario:",
    input.userMessage,
    "",
    "Resposta do agente (contexto):",
    input.agentResponse || "(vazio)",
    "",
    existingLines.length > 0
      ? "Dados ja conhecidos do contato:\n" + existingLines.join("\n")
      : "Dados ja conhecidos do contato: (nenhum)",
  ].join("\n");
};

const sanitizeExtractedFields = (
  payload: Record<string, unknown>,
  existingMetadata?: ContactMetadata | null,
): Record<string, string> => {
  const rawDados =
    payload.dados && typeof payload.dados === "object" ? payload.dados : payload;
  const out: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(rawDados)) {
    if (typeof rawValue !== "string") continue;

    const key = normalizeFieldKey(rawKey);
    if (!FALLBACK_FIELD_SET.has(key)) continue;

    const value = rawValue.trim();
    if (!value) continue;

    const existingValue = existingMetadata?.[key];
    if (
      typeof existingValue === "string" &&
      existingValue.trim().toLowerCase() === value.toLowerCase()
    ) {
      continue;
    }

    out[key] = value;
  }

  return out;
};

export const hasLikelyContactData = (message: string): boolean => {
  const text = (message || "").trim();
  if (!text) return false;

  const lowered = text.toLowerCase();
  const normalized = lowered
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const hasDirectPattern =
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(text) ||
    /\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/.test(text) ||
    /\b\d{5}-?\d{3}\b/.test(text) ||
    /\b\d{2}[/.-]\d{2}[/.-]\d{4}\b/.test(text);

  if (hasDirectPattern) return true;

  const hasKeyword =
    /(cpf|email|e-mail|cep|endereco|rg|nascimento|bairro|cidade|estado|indicado|como conheceu|objetivo|profissao|telefone alternativo|experiencia|iniciante|periodo|turno|manha|tarde|noite|segunda|terca|quarta|quinta|sexta|sabado|domingo)/i.test(
      normalized,
    );
  const hasStructuredShape = /[:=]/.test(text);

  const hasNaturalSignals =
    /(nunca pratiquei|ja pratiquei|pratico atualmente|sou iniciante|iniciante|estou comecando)/i.test(
      normalized,
    ) ||
    /\b(manha|tarde|noite)\b/i.test(normalized) ||
    /\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/i.test(normalized);

  return hasKeyword && (hasStructuredShape || hasNaturalSignals);
};

export const extractContactDataFallback = async (
  input: ExtractContactDataFallbackInput,
): Promise<ExtractContactDataFallbackResult> => {
  if (!hasLikelyContactData(input.userMessage)) {
    return {
      attempted: false,
      extracted: {},
      saved: {},
      rejected: [],
      persisted: false,
    };
  }

  try {
    const ai = await callDirectAI({
      clientId: input.clientId,
      clientConfig: {
        id: input.clientId,
        primaryModelProvider: "openai",
        openaiModel: "gpt-4o-mini",
      },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
      settings: {
        temperature: 0,
        maxTokens: 400,
      },
      skipUsageLogging: true,
      metadata: {
        source: "contact_data_fallback",
      },
    });

    const parsed = extractJsonObject(ai.text);
    if (!parsed) {
      return {
        attempted: true,
        extracted: {},
        saved: {},
        rejected: [],
        persisted: false,
        error: "fallback_invalid_json",
      };
    }

    const extracted = sanitizeExtractedFields(parsed, input.existingMetadata);
    if (Object.keys(extracted).length === 0) {
      return {
        attempted: true,
        extracted: {},
        saved: {},
        rejected: [],
        persisted: false,
      };
    }

    const saveResult = await updateContactMetadata({
      phone: input.phone,
      clientId: input.clientId,
      fields: extracted,
    });

    return {
      attempted: true,
      extracted,
      saved: saveResult.saved,
      rejected: saveResult.rejected.map((item) => ({
        field: item.field,
        reason: item.reason,
      })),
      persisted: saveResult.persisted,
      error: saveResult.error,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "fallback_unknown_error";
    console.warn("[extractContactDataFallback] failed", {
      clientId: input.clientId,
      phone: input.phone,
      error: message,
    });
    return {
      attempted: true,
      extracted: {},
      saved: {},
      rejected: [],
      persisted: false,
      error: message,
    };
  }
};

export const scheduleExtractContactDataFallback = (
  input: ExtractContactDataFallbackInput,
): void => {
  if (!hasLikelyContactData(input.userMessage)) {
    return;
  }

  setImmediate(() => {
    extractContactDataFallback(input)
      .then((result) => {
        if (!result.attempted) return;
        console.log("[extractContactDataFallback] completed", {
          clientId: input.clientId,
          phone: input.phone,
          extractedFields: Object.keys(result.extracted),
          savedFields: Object.keys(result.saved),
          rejected: result.rejected,
          persisted: result.persisted,
          error: result.error,
        });
      })
      .catch((error) => {
        console.warn("[extractContactDataFallback] async schedule error", {
          clientId: input.clientId,
          phone: input.phone,
          error: error instanceof Error ? error.message : "unknown_error",
        });
      });
  });
};


