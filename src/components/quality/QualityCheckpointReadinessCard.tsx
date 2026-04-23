"use client";

import { apiFetch } from "@/lib/api";
import type {
  QualityCheckpointCriterion,
  QualityCheckpointReadiness,
} from "@/lib/quality-checkpoint-readiness";
import { useCallback, useEffect, useMemo, useState } from "react";

type CheckpointResponse = {
  data?: QualityCheckpointReadiness;
  error?: string;
};

const statusLabel = (status: QualityCheckpointReadiness["status"]) => {
  if (status === "ready_for_s5") return "Pronto para S5";
  if (status === "not_ready") return "Nao pronto";
  return "Aguardando dados";
};

const statusClass = (status: QualityCheckpointReadiness["status"]) => {
  if (status === "ready_for_s5") return "text-green-700 bg-green-100 border-green-200";
  if (status === "not_ready") return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-slate-700 bg-slate-100 border-slate-200";
};

const criterionClass = (criterion: QualityCheckpointCriterion) => {
  if (criterion.pass) return "text-green-700";
  if (criterion.blocking) return "text-red-700";
  return "text-amber-700";
};

export function QualityCheckpointReadinessCard() {
  const [data, setData] = useState<QualityCheckpointReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/quality/checkpoint-readiness");
      const json = (await response.json()) as CheckpointResponse;
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Falha ao carregar checkpoint");
      }
      setData(json.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro inesperado");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const failingBlocking = useMemo(
    () => data?.criteria.filter((criterion) => criterion.blocking && !criterion.pass) ?? [],
    [data?.criteria],
  );

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Checkpoint de prontidao (24h)</p>
          <p className="text-xs text-muted-foreground">
            Decide se podemos seguir para Sprint 5 sem retrabalho.
          </p>
        </div>
        <button
          type="button"
          className="text-xs underline underline-offset-2"
          onClick={load}
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando checkpoint...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : data ? (
        <>
          <div
            className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClass(data.status)}`}
          >
            {statusLabel(data.status)}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {data.criteria.map((criterion) => (
              <div key={criterion.key} className="rounded border p-2 text-xs">
                <p className={`font-medium ${criterionClass(criterion)}`}>
                  {criterion.pass ? "OK" : criterion.blocking ? "FALHOU" : "ATENCAO"} {criterion.label}
                </p>
                <p className="text-muted-foreground">{criterion.detail}</p>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Snapshot:{" "}
              <span className="font-medium text-foreground">
                {data.reportDate ?? "sem data"}
              </span>
            </p>
            <p>
              Traces:{" "}
              <span className="font-medium text-foreground">
                {data.summary.totalTraces}
              </span>{" "}
              | Pending:{" "}
              <span className="font-medium text-foreground">
                {data.summary.pendingCount} ({data.summary.pendingRatioPct}%)
              </span>
            </p>
          </div>

          {failingBlocking.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
              <p className="font-medium text-amber-800">Proximos ajustes antes de S5:</p>
              {data.nextSteps.map((step, index) => (
                <p key={`${index}-${step}`} className="text-amber-700">
                  {index + 1}. {step}
                </p>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
