import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export interface GroundTruthEntry {
  id: string;
  client_id: string;
  user_query: string;
  expected_response: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  confidence: number;
  is_active: boolean;
  version: number;
  source: "manual" | "mined" | "synthetic" | "operator_correction";
  source_trace_id: string | null;
  validated_by: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GroundTruthBootstrapCandidate {
  trace_id: string;
  created_at: string;
  status: string;
  user_query: string;
  expected_response: string;
  similarity_key: string;
}

interface GroundTruthListResponse {
  data: GroundTruthEntry[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface GroundTruthBootstrapCandidatesResponse {
  data: GroundTruthBootstrapCandidate[];
  meta: {
    limit: number;
    lookbackDays: number;
    total: number;
  };
  error?: string;
}

interface GroundTruthBulkFromTraceResponse {
  success: boolean;
  batch_id: string;
  summary: {
    requested: number;
    created: number;
    skipped: number;
    failed: number;
  };
  created: Array<{ trace_id: string; ground_truth_id: string }>;
  skipped: Array<{ trace_id: string; reason: string }>;
  failed: Array<{ trace_id: string; reason: string }>;
  error?: string;
}

export interface UseGroundTruthFilters {
  category?: string;
  search?: string;
  active?: "true" | "false";
}

export const useGroundTruth = (initialFilters: UseGroundTruthFilters = {}) => {
  const [items, setItems] = useState<GroundTruthEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseGroundTruthFilters>(initialFilters);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (filters.category) params.set("category", filters.category);
      if (filters.search) params.set("search", filters.search);
      if (filters.active) params.set("active", filters.active);

      const res = await apiFetch(`/api/ground-truth?${params.toString()}`);
      const json = (await res.json()) as GroundTruthListResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar ground truth");

      setItems(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters.active, filters.category, filters.search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(
    async (payload: {
      user_query: string;
      expected_response: string;
      category?: string;
      subcategory?: string;
      tags?: string[];
      confidence?: number;
    }) => {
      const res = await apiFetch("/api/ground-truth", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao criar entrada");
      }
      await fetchItems();
      return json.data as GroundTruthEntry;
    },
    [fetchItems],
  );

  const updateItem = useCallback(
    async (
      id: string,
      payload: Partial<{
        user_query: string;
        expected_response: string;
        category: string | null;
        subcategory: string | null;
        tags: string[];
        confidence: number;
      }>,
    ) => {
      const res = await apiFetch(`/api/ground-truth/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao editar entrada");
      }
      await fetchItems();
      return json.data as GroundTruthEntry;
    },
    [fetchItems],
  );

  const deactivateItem = useCallback(
    async (id: string) => {
      const res = await apiFetch(`/api/ground-truth/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao desativar entrada");
      }
      await fetchItems();
    },
    [fetchItems],
  );

  const validateItem = useCallback(
    async (id: string, confidence?: number) => {
      const res = await apiFetch(`/api/ground-truth/${id}/validate`, {
        method: "POST",
        body: JSON.stringify(
          confidence !== undefined ? { confidence } : {},
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao validar entrada");
      }
      await fetchItems();
      return json.data as GroundTruthEntry;
    },
    [fetchItems],
  );

  const createFromTrace = useCallback(
    async (payload: {
      trace_id: string;
      expected_response: string;
      category?: string;
      subcategory?: string;
      tags?: string[];
      confidence?: number;
    }) => {
      const res = await apiFetch("/api/ground-truth/from-trace", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao promover trace para GT");
      }
      await fetchItems();
      return json.data as GroundTruthEntry;
    },
    [fetchItems],
  );

  const createFromTraceBulk = useCallback(
    async (
      items: Array<{
        trace_id: string;
        expected_response?: string;
        category?: string;
        subcategory?: string;
        tags?: string[];
        confidence?: number;
      }>,
    ) => {
      const res = await apiFetch("/api/ground-truth/from-trace/bulk", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      const json = (await res.json().catch(() => ({}))) as GroundTruthBulkFromTraceResponse;
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao promover traces em lote");
      }
      await fetchItems();
      return json;
    },
    [fetchItems],
  );

  const fetchBootstrapCandidates = useCallback(
    async (options?: { limit?: number; lookbackDays?: number }) => {
      const sp = new URLSearchParams();
      if (options?.limit != null) sp.set("limit", String(options.limit));
      if (options?.lookbackDays != null) {
        sp.set("lookbackDays", String(options.lookbackDays));
      }
      const qs = sp.toString();
      const res = await apiFetch(
        `/api/ground-truth/bootstrap-candidates${qs ? `?${qs}` : ""}`,
      );
      const json =
        (await res.json().catch(() => ({}))) as GroundTruthBootstrapCandidatesResponse;
      if (!res.ok) {
        throw new Error(json.error ?? "Falha ao buscar candidatos");
      }
      return json.data ?? [];
    },
    [],
  );

  return {
    items,
    total,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchItems,
    createItem,
    updateItem,
    deactivateItem,
    validateItem,
    createFromTrace,
    createFromTraceBulk,
    fetchBootstrapCandidates,
  };
};
