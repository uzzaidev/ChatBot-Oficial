"use client";

import { apiFetch } from "@/lib/api";
import type { ConversationStatus, CRMCard, CRMFilters } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

// Cards loaded per column on initial load; "Ver mais" fetches the next page
const DEFAULT_LIMIT_PER_COLUMN = 10;

interface UseCRMCardsResult {
  cards: CRMCard[];
  loading: boolean;
  error: string | null;
  /** Total cards per column_id returned by the API */
  columnTotals: Record<string, number>;
  /** Append the next page of cards for a specific column */
  loadMoreForColumn: (columnId: string) => Promise<void>;
  createCard: (data: {
    column_id: string;
    phone: string | number;
  }) => Promise<CRMCard | null>;
  updateCard: (id: string, data: Partial<CRMCard>) => Promise<CRMCard | null>;
  deleteCard: (id: string) => Promise<boolean>;
  moveCard: (
    id: string,
    column_id: string,
    position?: number,
  ) => Promise<boolean>;
  addTag: (cardId: string, tagId: string) => Promise<boolean>;
  removeTag: (cardId: string, tagId: string) => Promise<boolean>;
  bulkUpdateColumnStatus: (
    columnId: string,
    status: ConversationStatus,
  ) => Promise<{ updated: number } | null>;
  refetch: () => Promise<void>;
}

export const useCRMCards = (
  clientId: string | null,
  filters?: CRMFilters,
): UseCRMCardsResult => {
  const [cards, setCards] = useState<CRMCard[]>([]);
  const [columnTotals, setColumnTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track whether we have shown data at least once (stale-while-revalidate)
  const hasDataRef = useRef(false);

  const fetchCards = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    // Only show full loading spinner on the very first load (no stale data yet)
    if (!hasDataRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters?.search) {
        // Search mode: return all matches (API ignores limitPerColumn)
        params.append("search", filters.search);
      } else {
        // Initial load mode: per-column window function
        params.append("limitPerColumn", String(DEFAULT_LIMIT_PER_COLUMN));
      }
      if (filters?.autoStatus) params.append("autoStatus", filters.autoStatus);
      if (filters?.assignedTo) params.append("assignedTo", filters.assignedTo);

      const response = await apiFetch(`/api/crm/cards?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch cards");
      }

      const data = await response.json();
      setCards(data.cards || []);
      setColumnTotals(data.columnTotals ?? {});
      hasDataRef.current = true;
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching CRM cards:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, filters]);

  /** Append the next page of cards for the given column */
  const loadMoreForColumn = useCallback(
    async (columnId: string) => {
      if (!clientId) return;

      const loaded = cards.filter((c) => c.column_id === columnId).length;
      const total = columnTotals[columnId] ?? 0;
      if (loaded >= total) return; // nothing left to load

      try {
        const params = new URLSearchParams({
          columnId,
          limit: String(DEFAULT_LIMIT_PER_COLUMN),
          offset: String(loaded),
        });
        if (filters?.autoStatus)
          params.append("autoStatus", filters.autoStatus);
        if (filters?.assignedTo)
          params.append("assignedTo", filters.assignedTo);

        const response = await apiFetch(`/api/crm/cards?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load more cards");
        }

        const data = await response.json();
        const newCards: CRMCard[] = data.cards || [];

        // Append only cards we don't already have
        setCards((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const fresh = newCards.filter((c) => !existingIds.has(c.id));
          return [...prev, ...fresh];
        });
      } catch (err: any) {
        setError(err.message);
        console.error("Error loading more cards:", err);
      }
    },
    [clientId, cards, columnTotals, filters],
  );

  // Reset stale-data flag when clientId changes so new account always shows loader
  useEffect(() => {
    hasDataRef.current = false;
    setColumnTotals({});
  }, [clientId]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const createCard = useCallback(
    async (data: { column_id: string; phone: string | number }) => {
      try {
        const response = await apiFetch("/api/crm/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create card");
        }

        const result = await response.json();
        await fetchCards(); // Refresh list
        return result.card;
      } catch (err: any) {
        setError(err.message);
        console.error("Error creating card:", err);
        return null;
      }
    },
    [fetchCards],
  );

  const updateCard = useCallback(async (id: string, data: Partial<CRMCard>) => {
    try {
      const response = await apiFetch(`/api/crm/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update card");
      }

      const result = await response.json();

      // Update local state optimistically
      setCards((prev) =>
        prev.map((card) =>
          card.id === id ? { ...card, ...result.card } : card,
        ),
      );

      return result.card;
    } catch (err: any) {
      setError(err.message);
      console.error("Error updating card:", err);
      return null;
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    try {
      const response = await apiFetch(`/api/crm/cards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete card");
      }

      // Remove from local state
      setCards((prev) => prev.filter((card) => card.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error("Error deleting card:", err);
      return false;
    }
  }, []);

  const moveCard = useCallback(
    async (id: string, column_id: string, position?: number) => {
      console.log("[moveCard] Starting move:", { id, column_id, position });

      // Optimistic update - update UI immediately
      const cardToMove = cards.find((c) => c.id === id);
      if (!cardToMove) {
        console.log("[moveCard] Card not found:", id);
        return false;
      }

      // Skip if moving to same position
      if (cardToMove.column_id === column_id && position === undefined) {
        console.log("[moveCard] Same column, no position change - skipping");
        return true;
      }

      const oldColumnId = cardToMove.column_id;
      const oldPosition = cardToMove.position;

      // Calculate new position if not provided
      const targetPosition =
        position ?? cards.filter((c) => c.column_id === column_id).length;

      console.log("[moveCard] Optimistic update:", {
        oldColumnId,
        oldPosition,
        targetPosition,
      });

      // Update local state immediately (optimistic)
      setCards((prev) => {
        const updated = prev.map((card) => {
          if (card.id === id) {
            return { ...card, column_id, position: targetPosition };
          }
          // Adjust positions in old column
          if (card.column_id === oldColumnId && card.position > oldPosition) {
            return { ...card, position: card.position - 1 };
          }
          // Adjust positions in new column
          if (
            card.column_id === column_id &&
            card.position >= targetPosition &&
            card.id !== id
          ) {
            return { ...card, position: card.position + 1 };
          }
          return card;
        });
        console.log("[moveCard] State updated optimistically");
        return updated;
      });

      try {
        console.log("[moveCard] Calling API...");
        const response = await apiFetch(`/api/crm/cards/${id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column_id, position: targetPosition }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log("[moveCard] API error:", errorData);
          // Revert on error
          setCards((prev) =>
            prev.map((card) =>
              card.id === id
                ? { ...card, column_id: oldColumnId, position: oldPosition }
                : card,
            ),
          );
          throw new Error(errorData.error || "Failed to move card");
        }

        console.log("[moveCard] Success!");
        return true;
      } catch (err: any) {
        setError(err.message);
        console.error("[moveCard] Error:", err);
        // Revert optimistic update on error
        setCards((prev) =>
          prev.map((card) =>
            card.id === id
              ? { ...card, column_id: oldColumnId, position: oldPosition }
              : card,
          ),
        );
        return false;
      }
    },
    [cards],
  );

  const addTag = useCallback(async (cardId: string, tagId: string) => {
    try {
      const response = await apiFetch(`/api/crm/cards/${cardId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_id: tagId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add tag");
      }

      // Update local state
      setCards((prev) =>
        prev.map((card) =>
          card.id === cardId
            ? { ...card, tagIds: [...(card.tagIds || []), tagId] }
            : card,
        ),
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error("Error adding tag:", err);
      return false;
    }
  }, []);

  const removeTag = useCallback(async (cardId: string, tagId: string) => {
    try {
      const response = await apiFetch(
        `/api/crm/cards/${cardId}/tags?tag_id=${tagId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove tag");
      }

      // Update local state
      setCards((prev) =>
        prev.map((card) =>
          card.id === cardId
            ? {
                ...card,
                tagIds: (card.tagIds || []).filter((id) => id !== tagId),
              }
            : card,
        ),
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error("Error removing tag:", err);
      return false;
    }
  }, []);

  const bulkUpdateColumnStatus = useCallback(
    async (
      columnId: string,
      status: ConversationStatus,
    ): Promise<{ updated: number } | null> => {
      try {
        const response = await apiFetch(
          `/api/crm/columns/${columnId}/bulk-status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to bulk update status");
        }

        const result = await response.json();
        await fetchCards();

        return {
          updated: Number(result.updated || 0),
        };
      } catch (err: any) {
        setError(err.message);
        console.error("Error bulk updating column status:", err);
        return null;
      }
    },
    [fetchCards],
  );

  return {
    cards,
    loading,
    error,
    columnTotals,
    loadMoreForColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    addTag,
    removeTag,
    bulkUpdateColumnStatus,
    refetch: fetchCards,
  };
};
