"use client";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ReviewQueueItem {
  evaluation_id: string;
  trace_id: string;
  evaluation_created_at: string;
  verdict: "FAIL" | "REVIEW";
  trace_status: string;
  score_sum_0_to_4: number;
  user_msg_180: string;
  bot_msg_220: string;
}

interface ReviewQueueResponse {
  data?: ReviewQueueItem[];
  meta?: {
    total: number;
  };
  error?: string;
}

export function ReviewQueuePanel(props: { onOpenTrace: (traceId: string) => void }) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        "/api/evaluations/review-queue?lookbackDays=14&limit=8",
      );
      const json = (await response.json()) as ReviewQueueResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Falha ao carregar fila");
      }
      setItems(json.data ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Erro ao carregar fila",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: items.length,
      fail: items.filter((item) => item.verdict === "FAIL").length,
      review: items.filter((item) => item.verdict === "REVIEW").length,
    }),
    [items],
  );

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">Fila S4 (FAIL/REVIEW sem feedback)</p>
        <span className="text-xs text-muted-foreground">
          total: {summary.total} • FAIL: {summary.fail} • REVIEW: {summary.review}
        </span>
        <Button size="sm" variant="outline" onClick={load} className="ml-auto">
          Atualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando fila...</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sem itens pendentes de revisao no periodo.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.evaluation_id}
              className="rounded border border-border/70 px-2 py-2 flex gap-2 items-start"
            >
              <span
                className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  item.verdict === "FAIL"
                    ? "bg-red-500/15 text-red-600"
                    : "bg-amber-500/15 text-amber-600"
                }`}
              >
                {item.verdict}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs truncate">{item.user_msg_180}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  score 0-4: {item.score_sum_0_to_4.toFixed(2)} •{" "}
                  {new Date(item.evaluation_created_at).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onOpenTrace(item.trace_id)}
              >
                Abrir
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
