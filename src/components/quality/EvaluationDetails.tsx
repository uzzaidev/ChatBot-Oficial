"use client";

import { ScoreBadge } from "@/components/quality/ScoreBadge";

export interface EvaluationDetailPayload {
  id: string;
  trace_id: string;
  verdict: "PASS" | "REVIEW" | "FAIL";
  composite_score: number;
  alignment_score: number | null;
  relevance_score: number | null;
  finality_score: number;
  safety_score: number;
  alignment_reasoning?: string | null;
  relevance_reasoning?: string | null;
  finality_reasoning?: string | null;
  safety_reasoning?: string | null;
  cost_usd: number | null;
  duration_ms: number | null;
  judge_model: string;
  evaluated_at: string;
  trace: {
    id: string;
    user_message: string;
    agent_response: string;
    phone: string;
    status: string;
    model_used?: string | null;
    created_at: string;
  } | null;
  human_feedback?: Array<{
    id: string;
    verdict: "correct" | "incorrect" | "partial";
    correction_text?: string | null;
    reason?: string | null;
    error_category?: string | null;
    marked_as_ground_truth: boolean;
    created_at: string;
  }>;
}

interface EvaluationDetailsProps {
  detail: EvaluationDetailPayload | null;
  loading: boolean;
}

export function EvaluationDetails({ detail, loading }: EvaluationDetailsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border p-4 h-full">
        <p className="text-sm text-muted-foreground">Carregando detalhe...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-lg border p-4 h-full">
        <p className="text-sm text-muted-foreground">
          Selecione uma avaliação para ver os detalhes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 h-full overflow-auto space-y-4" data-testid="eval-details">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">Detalhes da avaliação</p>
        <ScoreBadge score={detail.composite_score} verdict={detail.verdict} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Alignment</p>
          <p className="font-medium">{detail.alignment_score ?? "N/A"}</p>
        </div>
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Relevance</p>
          <p className="font-medium">{detail.relevance_score ?? "N/A"}</p>
        </div>
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Finality</p>
          <p className="font-medium">{detail.finality_score}</p>
        </div>
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Safety</p>
          <p className="font-medium">{detail.safety_score}</p>
        </div>
      </div>

      <div className="text-sm space-y-1">
        <p className="text-xs text-muted-foreground">Reasoning do juiz</p>
        {detail.alignment_reasoning && (
          <p>
            <span className="font-medium">Alignment:</span> {detail.alignment_reasoning}
          </p>
        )}
        {detail.relevance_reasoning && (
          <p>
            <span className="font-medium">Relevance:</span> {detail.relevance_reasoning}
          </p>
        )}
        {detail.finality_reasoning && (
          <p>
            <span className="font-medium">Finality:</span> {detail.finality_reasoning}
          </p>
        )}
        {detail.safety_reasoning && (
          <p>
            <span className="font-medium">Safety:</span> {detail.safety_reasoning}
          </p>
        )}
      </div>

      <div className="text-sm">
        <p className="text-xs text-muted-foreground">Custo e latência</p>
        <p>Custo: ${Number(detail.cost_usd ?? 0).toFixed(6)}</p>
        <p>Duração: {detail.duration_ms ?? 0} ms</p>
        <p>Modelo: {detail.judge_model}</p>
      </div>

      <div className="text-sm space-y-2">
        <p className="text-xs text-muted-foreground">Feedback humano</p>
        {detail.human_feedback && detail.human_feedback.length > 0 ? (
          detail.human_feedback.map((feedback) => (
            <div key={feedback.id} className="rounded border p-2">
              <p className="font-medium uppercase">{feedback.verdict}</p>
              {feedback.error_category && (
                <p className="text-xs text-muted-foreground">
                  Categoria: {feedback.error_category}
                </p>
              )}
              {feedback.reason && <p>{feedback.reason}</p>}
              {feedback.correction_text && (
                <p className="text-xs mt-1">
                  Correção: {feedback.correction_text}
                </p>
              )}
              {feedback.marked_as_ground_truth && (
                <p className="text-xs text-green-600 mt-1">Promovido para Ground Truth</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Sem feedback humano registrado.</p>
        )}
      </div>
    </div>
  );
}
