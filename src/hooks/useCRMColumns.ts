"use client";

import { apiFetch } from "@/lib/api";
import type { CRMColumn } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

interface UseCRMColumnsResult {
  columns: CRMColumn[];
  loading: boolean;
  error: string | null;
  createColumn: (data: {
    name: string;
    color?: string;
    icon?: string;
  }) => Promise<CRMColumn | null>;
  updateColumn: (
    id: string,
    data: { name?: string; color?: string; icon?: string },
  ) => Promise<CRMColumn | null>;
  deleteColumn: (id: string) => Promise<boolean>;
  reorderColumns: (
    columnOrders: Array<{ id: string; position: number }>,
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useCRMColumns = (clientId: string | null): UseCRMColumnsResult => {
  const [columns, setColumns] = useState<CRMColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchColumns = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch("/api/crm/columns");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch columns");
      }

      const data = await response.json();
      setColumns(data.columns || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching CRM columns:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Auto-fetch on mount and when clientId changes
  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  const createColumn = useCallback(
    async (data: { name: string; color?: string; icon?: string }) => {
      try {
        const response = await apiFetch("/api/crm/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create column");
        }

        const result = await response.json();
        await fetchColumns(); // Refresh list
        return result.column;
      } catch (err: any) {
        setError(err.message);
        console.error("Error creating column:", err);
        return null;
      }
    },
    [fetchColumns],
  );

  const updateColumn = useCallback(
    async (
      id: string,
      data: { name?: string; color?: string; icon?: string },
    ) => {
      try {
        const response = await apiFetch(`/api/crm/columns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update column");
        }

        const result = await response.json();
        await fetchColumns(); // Refresh list
        return result.column;
      } catch (err: any) {
        setError(err.message);
        console.error("Error updating column:", err);
        return null;
      }
    },
    [fetchColumns],
  );

  const deleteColumn = useCallback(
    async (id: string) => {
      try {
        const response = await apiFetch(`/api/crm/columns/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete column");
        }

        await fetchColumns(); // Refresh list
        return true;
      } catch (err: any) {
        setError(err.message);
        console.error("Error deleting column:", err);
        return false;
      }
    },
    [fetchColumns],
  );

  const reorderColumns = useCallback(
    async (columnOrders: Array<{ id: string; position: number }>) => {
      try {
        const response = await apiFetch("/api/crm/columns/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnOrders }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to reorder columns");
        }

        const data = await response.json();
        setColumns(data.columns || []);
        return true;
      } catch (err: any) {
        setError(err.message);
        console.error("Error reordering columns:", err);
        return false;
      }
    },
    [],
  );

  return {
    columns,
    loading,
    error,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    refetch: fetchColumns,
  };
};
