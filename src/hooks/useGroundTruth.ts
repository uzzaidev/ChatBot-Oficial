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

interface GroundTruthListResponse {
  data: GroundTruthEntry[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
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
  };
};
