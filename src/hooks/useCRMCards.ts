"use client";

import { apiFetch } from "@/lib/api";
import type { CRMCard, CRMFilters } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

interface UseCRMCardsResult {
  cards: CRMCard[];
  loading: boolean;
  error: string | null;
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
  refetch: () => Promise<void>;
}

export const useCRMCards = (
  clientId: string | null,
  filters?: CRMFilters,
): UseCRMCardsResult => {
  const [cards, setCards] = useState<CRMCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.search) {
        params.append("search", filters.search);
      }
      if (filters?.autoStatus) {
        params.append("autoStatus", filters.autoStatus);
      }
      if (filters?.assignedTo) {
        params.append("assignedTo", filters.assignedTo);
      }

      const response = await apiFetch(`/api/crm/cards?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch cards");
      }

      const data = await response.json();
      setCards(data.cards || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching CRM cards:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, filters]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    fetchCards();
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

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    addTag,
    removeTag,
    refetch: fetchCards,
  };
};
