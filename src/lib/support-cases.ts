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

export const isLikelySupportMessage = (
  message: string,
  intent?: string,
): boolean => {
  const normalizedMessage = message.toLowerCase();
  if (intent === "reclamacao") return true;
  return SUPPORT_KEYWORDS.some((keyword) => normalizedMessage.includes(keyword));
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
  const userMessage = params.userMessage.toLowerCase();
  const agentResponse = (params.agentResponse || "").toLowerCase();
  const flowError = String(params.flowMetadata?.["flow_error"] || "").toLowerCase();
  const aiError = String(params.flowMetadata?.["ai_error"] || "").toLowerCase();

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
    userMessage.includes("não entendeu") ||
    userMessage.includes("nao entendeu") ||
    userMessage.includes("resposta sem sentido");

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
