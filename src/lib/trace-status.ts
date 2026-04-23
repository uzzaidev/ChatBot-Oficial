export type PendingBucket =
  | "nao_chegou_na_geracao"
  | "geracao_iniciada_nao_concluida"
  | "geracao_concluida_sem_envio"
  | "enviado_sem_status"
  | "erro_ia"
  | "outro_pending";

export type AiFailureCategory =
  | "quota"
  | "rate_limit"
  | "timeout"
  | "provider_unavailable"
  | "unknown";

export interface TraceStatusLike {
  status?: string | null;
  webhook_received_at?: string | null;
  generation_started_at?: string | null;
  generation_completed_at?: string | null;
  sent_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

const ERROR_TEXT_KEYS = ["error", "fallbackReason", "fallback_reason"] as const;

const getErrorText = (metadata?: Record<string, unknown> | null): string => {
  if (!metadata || typeof metadata !== "object") return "";
  for (const key of ERROR_TEXT_KEYS) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
};

export const classifyAiFailureCategory = (
  rawError: string | null | undefined,
): AiFailureCategory => {
  const error = (rawError ?? "").toLowerCase();
  if (!error) return "unknown";
  if (/(quota|insufficient_quota|billing|exceeded your current quota)/i.test(error)) {
    return "quota";
  }
  if (/(rate limit|429|too many requests)/i.test(error)) {
    return "rate_limit";
  }
  if (/(timeout|timed out|etimedout|aborted|deadline)/i.test(error)) {
    return "timeout";
  }
  if (/(service unavailable|provider|temporarily unavailable|overloaded)/i.test(error)) {
    return "provider_unavailable";
  }
  return "unknown";
};

export const classifyPendingBucket = (trace: TraceStatusLike): PendingBucket => {
  const metadataError = getErrorText(trace.metadata);
  if (classifyAiFailureCategory(metadataError) !== "unknown") {
    return "erro_ia";
  }

  if (trace.sent_at) return "enviado_sem_status";
  if (!trace.generation_started_at) return "nao_chegou_na_geracao";
  if (trace.generation_started_at && !trace.generation_completed_at) {
    return "geracao_iniciada_nao_concluida";
  }
  if (trace.generation_completed_at && !trace.sent_at) {
    return "geracao_concluida_sem_envio";
  }
  return "outro_pending";
};

export const isSuccessfulWhatsAppStatus = (status: string | null | undefined): boolean => {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "sent" || normalized === "delivered" || normalized === "read";
};

export const isFailedWhatsAppStatus = (status: string | null | undefined): boolean => {
  return (status ?? "").toLowerCase() === "failed";
};

export const normalizePhoneDigits = (value: string | null | undefined): string => {
  return String(value ?? "").replace(/\D/g, "");
};

