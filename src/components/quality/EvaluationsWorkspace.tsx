"use client";

import { apiFetch } from "@/lib/api";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useHumanFeedback } from "@/hooks/useHumanFeedback";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConversationReview } from "./ConversationReview";
import { EvaluationDetails, EvaluationDetailPayload } from "./EvaluationDetails";
import { EvaluationList } from "./EvaluationList";
import { HumanFeedbackModal } from "./HumanFeedbackModal";
import { ReviewQueuePanel } from "./ReviewQueuePanel";

interface EvaluationDetailResponse {
  data?: EvaluationDetailPayload;
  error?: string;
}

export function EvaluationsWorkspace() {
  const { items, filters, setFilters, loading, error, refetch } = useEvaluations();
  const { submitFeedback, submitting, error: feedbackError, clearError } =
    useHumanFeedback();

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvaluationDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    open: boolean;
    verdict: "correct" | "incorrect" | "partial";
  }>({
    open: false,
    verdict: "incorrect",
  });

  const selectedItem = useMemo(
    () => items.find((item) => item.trace_id === selectedTraceId) ?? null,
    [items, selectedTraceId],
  );

  const fetchDetail = useCallback(async (traceId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await apiFetch(`/api/evaluations/${traceId}`);
      const json = (await response.json()) as EvaluationDetailResponse;
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Falha ao carregar detalhe");
      }
      setDetail(json.data);
    } catch (e) {
      setDetail(null);
      setDetailError(
        e instanceof Error ? e.message : "Erro inesperado ao carregar detalhe",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedTraceId(null);
      setDetail(null);
      return;
    }
    if (!selectedTraceId || !items.some((item) => item.trace_id === selectedTraceId)) {
      const first = items[0];
      setSelectedTraceId(first.trace_id);
      void fetchDetail(first.trace_id);
    }
  }, [items, selectedTraceId, fetchDetail]);

  const handleSelect = useCallback(
    (item: { trace_id: string }) => {
      setSelectedTraceId(item.trace_id);
      clearError();
      void fetchDetail(item.trace_id);
    },
    [clearError, fetchDetail],
  );

  const openTraceFromQueue = useCallback(
    (traceId: string) => {
      setSelectedTraceId(traceId);
      clearError();
      void fetchDetail(traceId);
    },
    [clearError, fetchDetail],
  );

  const submitAndRefresh = useCallback(
    async (
      verdict: "correct" | "incorrect" | "partial",
      extras?: {
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
      },
    ) => {
      if (!selectedTraceId) return;
      const result = await submitFeedback(selectedTraceId, {
        verdict,
        ...extras,
      });
      if (!result.ok) return;

      await refetch();
      await fetchDetail(selectedTraceId);
    },
    [fetchDetail, refetch, selectedTraceId, submitFeedback],
  );

  const handleQuickReview = useCallback(
    (verdict: "correct" | "incorrect" | "partial") => {
      if (verdict === "correct") {
        void submitAndRefresh("correct");
        return;
      }

      setModalState({ open: true, verdict });
    },
    [submitAndRefresh],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName.toUpperCase())
      ) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        handleQuickReview("correct");
      }
      if (event.key === "2") {
        event.preventDefault();
        handleQuickReview("incorrect");
      }
      if (event.key === "3") {
        event.preventDefault();
        handleQuickReview("partial");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleQuickReview]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revisões Humanas</h1>
        <p className="text-xs text-muted-foreground">
          Fluxo rápido: lista → conversa → detalhe
        </p>
      </div>

      {(feedbackError || detailError) && (
        <p className="text-sm text-red-500">{feedbackError ?? detailError}</p>
      )}

      <ReviewQueuePanel onOpenTrace={openTraceFromQueue} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[70vh]">
        <div className="xl:col-span-4">
          <EvaluationList
            items={items}
            loading={loading}
            error={error}
            filters={filters}
            setFilters={setFilters}
            selectedTraceId={selectedTraceId}
            onSelect={handleSelect}
          />
        </div>

        <div className="xl:col-span-4">
          <ConversationReview detail={detail} onQuickReview={handleQuickReview} />
        </div>

        <div className="xl:col-span-4">
          <EvaluationDetails detail={detail} loading={detailLoading} />
        </div>
      </div>

      <HumanFeedbackModal
        open={modalState.open}
        initialVerdict={modalState.verdict}
        traceId={selectedTraceId ?? ""}
        score={selectedItem?.composite_score}
        submitting={submitting}
        onClose={() =>
          setModalState((prev) => ({
            ...prev,
            open: false,
          }))
        }
        onConfirm={async (payload) => {
          await submitAndRefresh(payload.verdict, payload);
          setModalState((prev) => ({ ...prev, open: false }));
        }}
      />
    </div>
  );
}
