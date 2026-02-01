"use client";

import { apiFetch } from "@/lib/api";
import type { ScheduledMessage } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

interface UseScheduledMessagesResult {
  messages: ScheduledMessage[];
  loading: boolean;
  error: string | null;
  createMessage: (data: {
    phone: string | number;
    content: string;
    scheduled_for: string;
    card_id?: string;
    timezone?: string;
  }) => Promise<ScheduledMessage | null>;
  cancelMessage: (id: string) => Promise<boolean>;
  updateMessage: (
    id: string,
    data: {
      content?: string;
      scheduled_for?: string;
    },
  ) => Promise<ScheduledMessage | null>;
  refetch: () => Promise<void>;
}

interface UseScheduledMessagesOptions {
  status?: string;
  card_id?: string;
  phone?: string;
}

export const useScheduledMessages = (
  clientId: string | null,
  options?: UseScheduledMessagesOptions,
): UseScheduledMessagesResult => {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.status) params.append("status", options.status);
      if (options?.card_id) params.append("card_id", options.card_id);
      if (options?.phone) params.append("phone", options.phone);

      const response = await apiFetch(
        `/api/crm/scheduled?${params.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch scheduled messages",
        );
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching scheduled messages:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, options?.status, options?.card_id, options?.phone]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const createMessage = useCallback(
    async (data: {
      phone: string | number;
      content: string;
      scheduled_for: string;
      card_id?: string;
      timezone?: string;
    }): Promise<ScheduledMessage | null> => {
      try {
        const response = await apiFetch("/api/crm/scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to create scheduled message",
          );
        }

        const { message } = await response.json();

        // Add to local state
        setMessages((prev) =>
          [...prev, message].sort(
            (a, b) =>
              new Date(a.scheduled_for).getTime() -
              new Date(b.scheduled_for).getTime(),
          ),
        );

        return message;
      } catch (err: any) {
        setError(err.message);
        console.error("Error creating scheduled message:", err);
        return null;
      }
    },
    [],
  );

  const cancelMessage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/crm/scheduled/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to cancel scheduled message",
        );
      }

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, status: "cancelled" as const } : msg,
        ),
      );

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error("Error cancelling scheduled message:", err);
      return false;
    }
  }, []);

  const updateMessage = useCallback(
    async (
      id: string,
      data: { content?: string; scheduled_for?: string },
    ): Promise<ScheduledMessage | null> => {
      try {
        const response = await apiFetch(`/api/crm/scheduled/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to update scheduled message",
          );
        }

        const { message } = await response.json();

        // Update local state
        setMessages((prev) =>
          prev
            .map((msg) => (msg.id === id ? message : msg))
            .sort(
              (a, b) =>
                new Date(a.scheduled_for).getTime() -
                new Date(b.scheduled_for).getTime(),
            ),
        );

        return message;
      } catch (err: any) {
        setError(err.message);
        console.error("Error updating scheduled message:", err);
        return null;
      }
    },
    [],
  );

  return {
    messages,
    loading,
    error,
    createMessage,
    cancelMessage,
    updateMessage,
    refetch: fetchMessages,
  };
};
