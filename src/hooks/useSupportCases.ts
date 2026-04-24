import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export interface SupportCaseItem {
  id: string;
  trace_id: string | null;
  phone: string;
  user_message: string;
  agent_response: string | null;
  severity: "low" | "medium" | "high" | "critical";
  root_cause_type: "prompt" | "flow" | "system" | "unknown";
  confidence: number;
  status: "new" | "triaged" | "in_progress" | "resolved" | "dismissed";
  recommended_action: string;
  created_at: string;
}

interface SupportCasesResponse {
  data: SupportCaseItem[];
  error?: string;
}

export interface SupportCaseFilters {
  status?: SupportCaseItem["status"] | "all";
  severity?: SupportCaseItem["severity"] | "all";
  rootCause?: SupportCaseItem["root_cause_type"] | "all";
  search?: string;
}

export const useSupportCases = () => {
  const [items, setItems] = useState<SupportCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SupportCaseFilters>({
    status: "all",
    severity: "all",
    rootCause: "all",
    search: "",
  });

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (filters.status && filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters.severity && filters.severity !== "all") {
        params.set("severity", filters.severity);
      }
      if (filters.rootCause && filters.rootCause !== "all") {
        params.set("rootCause", filters.rootCause);
      }
      if (filters.search && filters.search.trim().length > 0) {
        params.set("search", filters.search.trim());
      }

      const response = await apiFetch(`/api/support/cases?${params.toString()}`);
      const json = (await response.json()) as SupportCasesResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Falha ao carregar casos de suporte");
      }
      setItems(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters.rootCause, filters.search, filters.severity, filters.status]);

  const updateCase = useCallback(
    async (
      id: string,
      payload: Partial<
        Pick<
          SupportCaseItem,
          "status" | "severity" | "root_cause_type" | "recommended_action"
        >
      >,
    ) => {
      const response = await apiFetch(`/api/support/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao atualizar caso");
      }
      await fetchCases();
    },
    [fetchCases],
  );

  const convertCaseToTask = useCallback(
    async (id: string) => {
      const response = await apiFetch(`/api/support/cases/${id}/convert-task`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao converter caso em tarefa");
      }
      await fetchCases();
    },
    [fetchCases],
  );

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return {
    items,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchCases,
    updateCase,
    convertCaseToTask,
  };
};
