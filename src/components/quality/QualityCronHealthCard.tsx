"use client";

import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

interface CronHealthItem {
  key: "traces_reconcile" | "quality_daily_report";
  status: "ok" | "warning" | "critical";
  detail: string;
  lastRunAt: string | null;
}

interface CronHealthResponse {
  data?: {
    status: "ok" | "warning" | "critical";
    crons: CronHealthItem[];
    recentLoad: {
      last2hTraces: number;
      last2hPending: number;
    };
  };
  error?: string;
}

const statusLabel = {
  ok: "OK",
  warning: "Alerta",
  critical: "Critico",
} as const;

const statusClass = {
  ok: "text-green-700 bg-green-100 border-green-200",
  warning: "text-amber-700 bg-amber-100 border-amber-200",
  critical: "text-red-700 bg-red-100 border-red-200",
} as const;

export function QualityCronHealthCard() {
  const [data, setData] = useState<CronHealthResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/quality/cron-health");
      const json = (await response.json()) as CronHealthResponse;
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Falha ao carregar saude dos crons");
      }
      setData(json.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Erro ao carregar saude",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Saude dos crons</p>
        <button
          type="button"
          className="ml-auto text-xs underline underline-offset-2"
          onClick={load}
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando saude...</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : !data ? null : (
        <>
          <div
            className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClass[data.status]}`}
          >
            {statusLabel[data.status]}
          </div>
          <div className="space-y-2">
            {data.crons.map((cron) => (
              <div key={cron.key} className="rounded border border-border/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">
                    {cron.key === "traces_reconcile"
                      ? "Traces reconcile"
                      : "Quality daily report"}
                  </p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClass[cron.status]}`}
                  >
                    {statusLabel[cron.status]}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{cron.detail}</p>
                <p className="text-[11px] text-muted-foreground">
                  ultimo run:{" "}
                  {cron.lastRunAt ? new Date(cron.lastRunAt).toLocaleString() : "n/a"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            carga 2h: {data.recentLoad.last2hTraces} traces •{" "}
            {data.recentLoad.last2hPending} pending
          </p>
        </>
      )}
    </div>
  );
}
