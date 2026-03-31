import { getClientConfig } from "@/lib/config";
import { normalizeCommercialIntent } from "@/lib/crm-intent-normalizer";
import { callDirectAI } from "@/lib/direct-ai-client";
import { query } from "@/lib/postgres";
import { z } from "zod";

const LLM_TIMEOUT_MS = 2000;
const DEFAULT_THRESHOLD = 0.85;
const DEFAULT_DAILY_BUDGET_USD = 2;

const IntentSchema = z.object({
  intent: z.string().min(1).max(80),
  urgency_level: z.enum(["low", "medium", "high"]).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

type UrgencyLevel = "low" | "medium" | "high";

export interface CRMIntentClassification {
  enabled: boolean;
  llmUsed: boolean;
  fallbackUsed: boolean;
  confidence: number;
  threshold: number;
  intent: string | null;
  urgencyLevel: UrgencyLevel | null;
  reason: string;
}

const isMissingDbObjectError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "42703";
};

const parseJsonObject = (text: string): unknown => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("invalid_json");
  }
};

const normalizeThreshold = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_THRESHOLD;
  return Math.max(0, Math.min(1, num));
};

const deterministicFallback = (
  message: string,
): Pick<
  CRMIntentClassification,
  "intent" | "urgencyLevel" | "confidence" | "reason"
> => {
  const text = message.toLowerCase();

  const highUrgency = /(urgente|agora|hoje|imediat|rapido|rápido)/i.test(text);
  const mediumUrgency = /(quando|prazo|ainda hoje|essa semana)/i.test(text);

  const rules: Array<{ intent: string; pattern: RegExp; confidence: number }> = [
    {
      intent: "close_sale",
      pattern: /(fechar|comprar|pagar|assinar|contratar|matr[ií]cula)/i,
      confidence: 0.9,
    },
    {
      intent: "schedule_trial",
      pattern: /(aula experimental|agendar|marcar|hor[aá]rio|consulta)/i,
      confidence: 0.88,
    },
    {
      intent: "pricing",
      pattern: /(pre[cç]o|valor|quanto|mensalidade|plano)/i,
      confidence: 0.86,
    },
    {
      intent: "cancellation_risk",
      pattern: /(cancelar|desistir|n[aã]o quero|parar)/i,
      confidence: 0.82,
    },
    {
      intent: "support_human",
      pattern: /(humano|atendente|pessoa|falar com algu[eé]m)/i,
      confidence: 0.84,
    },
  ];

  const matched = rules.find((rule) => rule.pattern.test(text));

  return {
    intent: matched?.intent ?? "unknown",
    urgencyLevel: highUrgency ? "high" : mediumUrgency ? "medium" : "low",
    confidence: matched?.confidence ?? 0.6,
    reason: matched ? "fallback_keyword_match" : "fallback_no_match",
  };
};

const getIntentSettings = async (clientId: string): Promise<{
  enabled: boolean;
  threshold: number;
}> => {
  try {
    const result = await query<{
      llm_intent_enabled: boolean | null;
      llm_intent_threshold: number | null;
    }>(
      `SELECT llm_intent_enabled, llm_intent_threshold
       FROM crm_settings
       WHERE client_id = $1
       LIMIT 1`,
      [clientId],
    );

    const row = result.rows[0];
    if (!row) {
      return { enabled: false, threshold: DEFAULT_THRESHOLD };
    }

    return {
      enabled: row.llm_intent_enabled === true,
      threshold: normalizeThreshold(row.llm_intent_threshold),
    };
  } catch (error) {
    if (isMissingDbObjectError(error)) {
      return { enabled: false, threshold: DEFAULT_THRESHOLD };
    }
    throw error;
  }
};

const getTodayClassifierCost = async (clientId: string): Promise<number> => {
  try {
    const result = await query<{ total: number | null }>(
      `SELECT COALESCE(SUM(cost_usd), 0)::numeric::float8 AS total
       FROM gateway_usage_logs
       WHERE client_id = $1
         AND created_at >= date_trunc('day', NOW())
         AND (metadata->>'crm_intent_classifier') = 'true'`,
      [clientId],
    );

    return Number(result.rows[0]?.total ?? 0);
  } catch (error) {
    if (isMissingDbObjectError(error)) return 0;
    throw error;
  }
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("crm_intent_timeout")), timeoutMs),
    ),
  ]);
};

export const classifyCRMIntent = async (params: {
  clientId: string;
  message: string;
  conversationId?: string;
  phone?: string;
}): Promise<CRMIntentClassification> => {
  const settings = await getIntentSettings(params.clientId);
  if (!settings.enabled) {
    return {
      enabled: false,
      llmUsed: false,
      fallbackUsed: false,
      confidence: 0,
      threshold: settings.threshold,
      intent: null,
      urgencyLevel: null,
      reason: "llm_intent_disabled",
    };
  }

  const budgetLimit = Number.parseFloat(
    process.env.LLM_MAX_COST_PER_DAY || String(DEFAULT_DAILY_BUDGET_USD),
  );
  const todayCost = await getTodayClassifierCost(params.clientId);
  if (Number.isFinite(budgetLimit) && todayCost >= budgetLimit) {
    const fallback = deterministicFallback(params.message);
    return {
      enabled: true,
      llmUsed: false,
      fallbackUsed: true,
      confidence: fallback.confidence,
      threshold: settings.threshold,
      intent: normalizeCommercialIntent(fallback.intent),
      urgencyLevel: fallback.urgencyLevel,
      reason: "llm_budget_exceeded",
    };
  }

  const config = await getClientConfig(params.clientId);
  const provider = config.primaryProvider === "groq" ? "groq" : "openai";

  const prompt = `Classifique a mensagem do lead para CRM.
Responda APENAS com JSON valido no formato:
{"intent":"<intent>","urgency_level":"low|medium|high","confidence":0.0}

Regras:
- intent deve ser curto, em snake_case, focado no objetivo comercial.
- confidence entre 0 e 1.
- urgency_level baseado no quao urgente o lead parece.
- Nunca inclua texto fora do JSON.`;

  try {
    const llm = await withTimeout(
      callDirectAI({
        clientId: params.clientId,
        clientConfig: {
          id: params.clientId,
          name: "crm-intent-classifier",
          primaryModelProvider: provider,
          openaiModel: config.models.openaiModel || "gpt-4o-mini",
          groqModel: config.models.groqModel || "llama-3.3-70b-versatile",
        },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: params.message },
        ],
        settings: {
          temperature: 0,
          maxTokens: 120,
        },
        conversationId: params.conversationId,
        phone: params.phone,
        metadata: {
          crm_intent_classifier: true,
        },
      }),
      LLM_TIMEOUT_MS,
    );

    const parsed = IntentSchema.parse(parseJsonObject(llm.text));

    return {
      enabled: true,
      llmUsed: true,
      fallbackUsed: false,
      confidence: parsed.confidence,
      threshold: settings.threshold,
      intent: normalizeCommercialIntent(parsed.intent),
      urgencyLevel: parsed.urgency_level ?? null,
      reason: "llm_success",
    };
  } catch (error) {
    const fallback = deterministicFallback(params.message);
    const reason =
      error instanceof Error && error.message === "crm_intent_timeout"
        ? "llm_timeout_fallback"
        : "llm_error_fallback";

    return {
      enabled: true,
      llmUsed: false,
      fallbackUsed: true,
      confidence: fallback.confidence,
      threshold: settings.threshold,
      intent: normalizeCommercialIntent(fallback.intent),
      urgencyLevel: fallback.urgencyLevel,
      reason,
    };
  }
};
