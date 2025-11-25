import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { createClientBrowser } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import type { ConversationStatus, ConversationWithCount } from "@/lib/types";
import {
  type ConversationUpdate,
  useRealtimeConversations,
} from "./useRealtimeConversations";

interface UseConversationsOptions {
  clientId: string;
  status?: ConversationStatus;
  limit?: number;
  offset?: number;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

interface UseConversationsResult {
  conversations: ConversationWithCount[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

export const useConversations = ({
  clientId, // Keep for backward compatibility and realtime filtering, but not sent to API
  status,
  limit = 50,
  offset = 0,
  refreshInterval = 0,
  enableRealtime = false,
}: UseConversationsOptions): UseConversationsResult => {
  const [conversations, setConversations] = useState<ConversationWithCount[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const fetchConversations = useCallback(async (isRealtimeUpdate = false) => {
    try {
      // Only show loading state on initial load, not on realtime updates
      if (!isRealtimeUpdate) {
        setLoading(true);
      }
      setError(null);

      // Use API route (has optimized SQL with JOIN and ORDER BY last_message_time)
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.append("status", status);
      }

      // Use apiFetch que adiciona token de autenticação no mobile
      const response = await apiFetch(
        `/api/conversations?${params.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar conversas");
      }

      const data = await response.json();
      setConversations(data.conversations || []);
      setTotal(data.total || 0);

      // Mark initial load as complete
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Erro desconhecido";
      setError(errorMessage);
      console.error("Erro ao buscar conversas:", err);
    } finally {
      // Only clear loading state if it was set (initial load or manual refresh)
      if (!isRealtimeUpdate) {
        setLoading(false);
      }
    }
  }, [status, limit, offset]);

  // Função debounced para evitar múltiplas chamadas rápidas do realtime
  const debouncedFetch = useCallback((delay: number = 0) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      // Pass true to indicate this is a realtime update (no loading state)
      fetchConversations(true);
    }, delay);
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchConversations();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchConversations]);

  // Realtime subscription for conversations usando novo hook otimizado
  const handleConversationUpdate = useCallback((update: ConversationUpdate) => {
    console.log(
      "🔔 [useConversations] Conversation update:",
      update.eventType,
      update.conversation,
    );

    // Refetch conversations com debounce para agrupar múltiplas mudanças
    if (update.eventType === "INSERT") {
      // Nova conversa - delay maior para garantir que mensagem foi salva
      debouncedFetch(500);
    } else if (update.eventType === "UPDATE") {
      // Conversa atualizada - delay menor
      debouncedFetch(300);
    } else if (update.eventType === "DELETE") {
      // Conversa deletada - refetch imediato
      debouncedFetch(100);
    }
  }, [debouncedFetch]);

  // Hook de realtime com retry, mobile support, etc
  const { isConnected: realtimeConnected } = useRealtimeConversations({
    clientId: enableRealtime ? clientId : "",
    onConversationUpdate: handleConversationUpdate,
  });

  // Fallback polling APENAS se realtime não conectar (ou FREE tier)
  useEffect(() => {
    if (!enableRealtime) {
      return; // Realtime desabilitado
    }

    // Esperar 2s para ver se realtime conecta (reduzido de 3s)
    const fallbackTimeout = setTimeout(() => {
      if (!realtimeConnected) {
        // Polling otimizado a cada 3s
        const pollInterval = setInterval(() => {
          fetchConversations(true);
        }, 3000);

        return () => {
          clearInterval(pollInterval);
        };
      }
    }, 2000); // Ativa polling após 2s

    return () => clearTimeout(fallbackTimeout);
  }, [enableRealtime, realtimeConnected, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    total,
    refetch: fetchConversations,
  };
};
