"use client";

import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

interface QualityDailyReportItem {
  reportDate: string;
  totalTraces: number;
  pendingCount: number;
  successRatePct: number;
}

interface DailyReportResponse {
  data?: QualityDailyReportItem[];
  error?: string;
}

const widthPct = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

export function QualityDailyTrendCard() {
  const [items, setItems] = useState<QualityDailyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/quality/daily-report?days=7");
      const json = (await response.json()) as DailyReportResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Falha ao carregar tendencia diaria");
      }
      const sorted = [...(json.data ?? [])].reverse();
      setItems(sorted);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Erro ao carregar tendencia",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = useMemo(() => items[items.length - 1] ?? null, [items]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Tendencia diaria (7 dias)</p>
        <button
          type="button"
          className="ml-auto text-xs underline underline-offset-2"
          onClick={load}
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando tendencia...</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sem snapshots suficientes para gerar tendencia.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const pendingRatio =
              item.totalTraces > 0 ? (item.pendingCount / item.totalTraces) * 100 : 0;
            return (
              <div key={item.reportDate} className="rounded border border-border/60 p-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{item.reportDate}</span>
                  <span className="text-muted-foreground">
                    traces: {item.totalTraces} • pending: {pendingRatio.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Success rate</p>
                    <div className="h-1.5 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: widthPct(item.successRatePct) }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pending ratio</p>
                    <div className="h-1.5 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: widthPct(pendingRatio) }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {latest && (
        <p className="text-[11px] text-muted-foreground">
          Ultimo dia: success {latest.successRatePct.toFixed(2)}% • total{" "}
          {latest.totalTraces}
        </p>
      )}
    </div>
  );
}
