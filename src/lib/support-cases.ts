import { createServiceRoleClient } from "@/lib/supabase";

export type SupportSeverity = "low" | "medium" | "high" | "critical";
export type SupportRootCauseType = "prompt" | "flow" | "system" | "unknown";
export type SupportCaseStatus =
  | "new"
  | "triaged"
  | "in_progress"
  | "resolved"
  | "dismissed";

export interface SupportCasePayload {
  client_id: string;
  trace_id?: string | null;
  conversation_id?: string | null;
  phone: string;
  user_message: string;
  agent_response?: string | null;
  detected_intent?: string | null;
  severity: SupportSeverity;
  root_cause_type: SupportRootCauseType;
  confidence: number;
  recommended_action: string;
  status?: SupportCaseStatus;
  metadata?: Record<string, unknown>;
}

const SUPPORT_KEYWORDS = [
  "suporte",
  "bug",
  "erro",
  "falha",
  "não funciona",
  "nao funciona",
  "quebrou",
  "problema",
  "travou",
  "instabilidade",
  "não abre",
  "nao abre",
];

const SUPPORT_IMPLICIT_SIGNALS = [
  "sumiu botao",
  "sumiu botão",
  "nao aparece",
  "não aparece",
  "nao envia",
  "não envia",
  "nao salva",
  "não salva",
  "nao chegou mensagem",
  "não chegou mensagem",
  "cliente falou",
  "respondeu outra coisa",
  "nao respondeu o que perguntei",
  "não respondeu o que perguntei",
  "respondeu nada a ver",
  "misturou conversa",
  "fora de contexto",
  "fora de ordem",
  "respondeu atrasado",
  "parou de responder",
];

const SUPPORT_OPERATIONAL_SIGNALS = [
  "mandou duas vezes",
  "mensagem duplicada",
  "respondeu duplicado",
  "duplicou",
  "duplicidade",
  "mandou duas imagens",
  "imagem repetida",
  "precisei mandar duas vezes",
  "retry",
  "reprocessamento",
];

const SUPPORT_VISUAL_SIGNALS = [
  "print",
  "screenshot",
  "imagem",
  "foto",
  "[imagem recebida]",
];

const normalizeSupportText = (value?: string | null): string =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const isLikelySupportMessage = (
  message: string,
  intent?: string,
  agentResponse?: string | null,
): boolean => {
  const normalizedMessage = normalizeSupportText(message);
  const normalizedIntent = normalizeSupportText(intent);
  const normalizedAgentResponse = normalizeSupportText(agentResponse);

  const hasIntentSignal =
    normalizedIntent === "reclamacao" ||
    normalizedIntent === "suporte" ||
    normalizedIntent === "problema_tecnico";

  if (hasIntentSignal) return true;

  const hasExplicitKeyword = SUPPORT_KEYWORDS.some((keyword) =>
    normalizedMessage.includes(normalizeSupportText(keyword)),
  );
  if (hasExplicitKeyword) return true;

  const hasImplicitSignal = SUPPORT_IMPLICIT_SIGNALS.some((signal) =>
    normalizedMessage.includes(normalizeSupportText(signal)),
  );
  if (hasImplicitSignal) return true;

  const hasOperationalSignal = SUPPORT_OPERATIONAL_SIGNALS.some((signal) =>
    normalizedMessage.includes(normalizeSupportText(signal)),
  );
  if (hasOperationalSignal) return true;

  const hasVisualSignal = SUPPORT_VISUAL_SIGNALS.some((signal) =>
    normalizedMessage.includes(normalizeSupportText(signal)),
  );
  if (hasVisualSignal && normalizedMessage.includes("erro")) return true;

  const hasResponseMismatchSignal =
    normalizedMessage.includes("respondeu") &&
    (normalizedMessage.includes("outra coisa") ||
      normalizedMessage.includes("nada a ver"));

  if (hasResponseMismatchSignal) return true;

  return (
    normalizedAgentResponse.includes("nao consegui") ||
    normalizedAgentResponse.includes("não consegui") ||
    normalizedAgentResponse.includes("instabilidade")
  );
};

export const classifySupportCase = (params: {
  userMessage: string;
  agentResponse?: string | null;
  intent?: string | null;
  flowMetadata?: Record<string, unknown>;
}): {
  severity: SupportSeverity;
  rootCause: SupportRootCauseType;
  confidence: number;
  recommendedAction: string;
} => {
  const userMessage = normalizeSupportText(params.userMessage);
  const agentResponse = normalizeSupportText(params.agentResponse);
  const flowError = normalizeSupportText(
    String(params.flowMetadata?.["flow_error"] || ""),
  );
  const aiError = normalizeSupportText(
    String(params.flowMetadata?.["ai_error"] || ""),
  );

  const hasInfraError =
    flowError.includes("timeout") ||
    flowError.includes("signature") ||
    flowError.includes("webhook") ||
    aiError.includes("429") ||
    aiError.includes("quota");

  if (hasInfraError) {
    return {
      severity: "critical",
      rootCause: "system",
      confidence: 0.9,
      recommendedAction:
        "Investigar logs de infraestrutura e integrações externas; validar timeout, webhook e credenciais.",
    };
  }

  const hasOperationalDuplicateSignal =
    userMessage.includes("duplic") ||
    userMessage.includes("mandou duas vezes") ||
    userMessage.includes("imagem repetida") ||
    userMessage.includes("fora de ordem") ||
    userMessage.includes("respondeu atrasado");

  if (hasOperationalDuplicateSignal) {
    return {
      severity: "high",
      rootCause: "system",
      confidence: 0.82,
      recommendedAction:
        "Investigar deduplicacao, retries e ordenacao de eventos para evitar repeticao ou envio fora de sequencia.",
    };
  }

  const hasFlowSignal =
    userMessage.includes("transfer") ||
    userMessage.includes("menu") ||
    userMessage.includes("fluxo") ||
    agentResponse.includes("vou te conectar");

  if (hasFlowSignal) {
    return {
      severity: "high",
      rootCause: "flow",
      confidence: 0.78,
      recommendedAction:
        "Revisar regras de roteamento, tool calls e transições de estado do fluxo para este cenário.",
    };
  }

  const hasPromptSignal =
    userMessage.includes("resposta errada") ||
    userMessage.includes("nao entendeu") ||
    userMessage.includes("nao entendeu") ||
    userMessage.includes("resposta sem sentido") ||
    userMessage.includes("respondeu outra coisa") ||
    userMessage.includes("nada a ver") ||
    userMessage.includes("fora de contexto");

  if (hasPromptSignal) {
    return {
      severity: "medium",
      rootCause: "prompt",
      confidence: 0.72,
      recommendedAction:
        "Ajustar instruções do prompt para clarificar contexto, tom e regras de não alucinação neste tipo de pedido.",
    };
  }

  return {
    severity: params.intent === "reclamacao" ? "high" : "medium",
    rootCause: "unknown",
    confidence: 0.55,
    recommendedAction:
      "Triar manualmente o caso para definir se a correção prioritária é de prompt, fluxo ou sistema.",
  };
};

export const upsertSupportCase = async (
  payload: SupportCasePayload,
): Promise<{ id: string } | null> => {
  const supabase = createServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("support_cases")
    .upsert(
      {
        ...payload,
        status: payload.status ?? "new",
        metadata: payload.metadata ?? {},
      },
      {
        onConflict: payload.trace_id ? "client_id,trace_id" : undefined,
      },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[support-cases] upsert failed:", error);
    return null;
  }

  return { id: data.id };
};
