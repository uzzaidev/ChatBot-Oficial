import { apiFetch } from "@/lib/api";
import { useCallback, useState } from "react";

export interface HumanFeedbackPayload {
  verdict: "correct" | "incorrect" | "partial";
  correction_text?: string;
  reason?: string;
  error_category?:
    | "wrong_chunk"
    | "bad_generation"
    | "missing_info"
    | "hallucination"
    | "gt_outdated"
    | "other";
  promote_to_ground_truth?: boolean;
}

interface SubmitResponse<T = unknown> {
  data?: T;
  error?: string;
}

export const useHumanFeedback = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(
    async (traceId: string, payload: HumanFeedbackPayload) => {
      setSubmitting(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/api/evaluations/${traceId}/human-feedback`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        const json = (await response.json()) as SubmitResponse;
        if (!response.ok) {
          throw new Error(json.error ?? "Falha ao enviar feedback");
        }

        return { ok: true as const, data: json.data ?? null };
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Erro inesperado ao enviar feedback";
        setError(message);
        return { ok: false as const, error: message };
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    submitFeedback,
    submitting,
    error,
    clearError: () => setError(null),
  };
};
