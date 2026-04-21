import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export interface EvaluationItem {
  id: string;
  trace_id: string;
  verdict: "PASS" | "REVIEW" | "FAIL";
  composite_score: number;
  cost_usd: number | null;
  duration_ms: number | null;
  evaluated_at: string;
  judge_model: string;
}

export interface EvaluationStats {
  total: number;
  averageScore: number;
  averageDurationMs: number;
  totalCostUsd: number;
  verdicts: {
    PASS: number;
    REVIEW: number;
    FAIL: number;
  };
}

interface EvaluationsListResponse {
  data: EvaluationItem[];
  meta: { limit: number; offset: number };
  error?: string;
}

interface EvaluationsStatsResponse {
  data: EvaluationStats;
  error?: string;
}

export interface UseEvaluationsFilters {
  verdict?: "PASS" | "REVIEW" | "FAIL";
  minScore?: number;
  maxScore?: number;
}

export const useEvaluations = (initialFilters: UseEvaluationsFilters = {}) => {
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [filters, setFilters] = useState<UseEvaluationsFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (filters.verdict) params.set("verdict", filters.verdict);
      if (filters.minScore != null) params.set("minScore", String(filters.minScore));
      if (filters.maxScore != null) params.set("maxScore", String(filters.maxScore));

      const [listRes, statsRes] = await Promise.all([
        apiFetch(`/api/evaluations?${params.toString()}`),
        apiFetch(`/api/evaluations/stats?${params.toString()}`),
      ]);

      const listJson = (await listRes.json()) as EvaluationsListResponse;
      const statsJson = (await statsRes.json()) as EvaluationsStatsResponse;

      if (!listRes.ok) {
        throw new Error(listJson.error ?? "Falha ao carregar evaluations");
      }
      if (!statsRes.ok) {
        throw new Error(statsJson.error ?? "Falha ao carregar stats");
      }

      setItems(listJson.data ?? []);
      setStats(statsJson.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setItems([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filters.maxScore, filters.minScore, filters.verdict]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    items,
    stats,
    filters,
    setFilters,
    loading,
    error,
    refetch: fetchAll,
  };
};

