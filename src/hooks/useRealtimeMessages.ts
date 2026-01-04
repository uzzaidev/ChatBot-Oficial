import { useCallback, useEffect, useRef, useState } from "react";
import { createClientBrowser } from "@/lib/supabase";
import { cleanMessageContent } from "@/lib/utils";
import type { Message } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

// Imports condicionais para mobile
let App: any;
let Network: any;

if (Capacitor.isNativePlatform()) {
  App = require("@capacitor/app").App;
  Network = require("@capacitor/network").Network;
}

interface UseRealtimeMessagesOptions {
  clientId: string;
  phone: string;
  onNewMessage?: (message: Message) => void;
  onMessageUpdate?: (update: {
    messageId: string;
    status: Message["status"];
    errorDetails?: unknown;
    statusUpdatedAt?: string;
  }) => void;
}

/**
 * Hook de Realtime usando Broadcast (FREE tier compatible)
 *
 * Escuta eventos broadcast enviados por triggers do banco de dados.
 * Sem retry loops - tenta conectar uma vez, se falhar aceita e para.
 * Fallback para polling já está implementado em useMessages.
 *
 * Otimizado para mobile:
 * - Debounce de 500ms para reconexões (evita race conditions)
 * - Lock de reconexão para evitar chamadas simultâneas
 * - Deduplicação de mensagens com Set de IDs processados
 */
export const useRealtimeMessages = ({
  clientId,
  phone,
  onNewMessage,
  onMessageUpdate,
}: UseRealtimeMessagesOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageUpdateRef = useRef(onMessageUpdate);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasAttemptedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  // Track processed message IDs to prevent duplicates
  // Using Map to store timestamp when message was processed (for cleanup)
  const processedMessageIdsRef = useRef<Map<string, number>>(new Map());

  // Keep the callback refs up to date
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageUpdateRef.current = onMessageUpdate;
  }, [onNewMessage, onMessageUpdate]);

  // Cleanup old processed message IDs (older than 5 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;

      processedMessageIdsRef.current.forEach((timestamp, id) => {
        if (now - timestamp > FIVE_MINUTES) {
          processedMessageIdsRef.current.delete(id);
        }
      });
    }, 60000); // Run cleanup every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Helper function to check and mark message as processed
  const shouldProcessMessage = useCallback((dedupeKey: string): boolean => {
    if (processedMessageIdsRef.current.has(dedupeKey)) {
      return false; // Already processed
    }

    // Mark as processed with current timestamp
    processedMessageIdsRef.current.set(dedupeKey, Date.now());
    return true;
  }, []);

  // Setup da subscription - UMA VEZ, sem retry loops
  const setupRealtimeSubscription = useCallback(() => {
    if (!clientId || !phone || hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    // Mark as reconnecting only after early returns
    isReconnectingRef.current = true;

    const supabase = createClientBrowser();
    const channelName = `messages:${clientId}:${phone}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          private: false,
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "n8n_chat_histories",
          // 🔐 Multi-tenant: Filter by client_id to ensure tenant isolation
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          try {
            const data = payload.new as any;

            // Filter by session_id (phone) - garantir que é a conversa certa
            if (data.session_id !== phone) {
              return;
            }

            // Generate consistent message ID
            const messageId = data.id?.toString() ||
              `msg-${data.created_at || Date.now()}`;

            // Prefer dedupe by wamid when present (avoids duplicates across tables)
            const wamid =
              typeof data.wamid === "string" && data.wamid.length > 0
                ? data.wamid
                : null;
            const dedupeKey = wamid ? `wamid:${wamid}` : `id:${messageId}`;

            // Check if message was already processed (deduplication)
            if (!shouldProcessMessage(dedupeKey)) {
              return; // Skip duplicate
            }

            // Parse message JSON
            let messageData: any;
            if (typeof data.message === "string") {
              try {
                messageData = JSON.parse(data.message);
              } catch {
                messageData = { type: "ai", content: data.message };
              }
            } else {
              messageData = data.message || {};
            }

            const messageType = messageData.type || "ai";
            const messageContent = messageData.content || "";
            const cleanedContent = cleanMessageContent(messageContent);

            const metadata: Record<string, unknown> = {};
            if (wamid) {
              metadata.wamid = wamid;
            }
            if (data.error_details) {
              metadata.error_details = data.error_details;
            }
            if (data.updated_at) {
              metadata.status_updated_at = data.updated_at;
            }

            const newMessage: Message = {
              id: messageId,
              client_id: clientId,
              conversation_id: String(phone),
              phone: phone,
              name: messageType === "human" ? "Cliente" : "Bot",
              content: cleanedContent,
              type: "text",
              direction: messageType === "human" ? "incoming" : "outgoing",
              status: (data.status || "sent") as Message["status"],
              timestamp: data.created_at || new Date().toISOString(),
              metadata: Object.keys(metadata).length > 0 ? metadata : null,
            };

            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage);
            }
          } catch (error) {
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "n8n_chat_histories",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          try {
            const data = payload.new as any;

            // Filter by session_id (phone) - garantir que é a conversa certa
            if (data.session_id !== phone) {
              return;
            }

            // Only process if status changed (status update from WhatsApp)
            if (!data.status) {
              return;
            }

            const messageId = data.id?.toString();
            if (!messageId) {
              return;
            }

            // Notify about status update (include error_details + updated_at for failed tooltips)
            if (onMessageUpdateRef.current) {
              onMessageUpdateRef.current({
                messageId,
                status: data.status,
                errorDetails: data.error_details ?? undefined,
                statusUpdatedAt: data.updated_at ?? undefined,
              });
            }
          } catch (error) {
            // Silent fail for status updates
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          try {
            const data = payload.new as any;

            if (!data || data.phone !== phone) return;

            // Generate consistent message ID
            const messageId = data.id?.toString() ||
              `msg-${data.timestamp || Date.now()}`;

            let parsedMetadata: Record<string, unknown> | null = null;
            if (data.metadata) {
              if (typeof data.metadata === "string") {
                try {
                  parsedMetadata = JSON.parse(data.metadata);
                } catch {
                  parsedMetadata = null;
                }
              } else if (typeof data.metadata === "object") {
                parsedMetadata = data.metadata as Record<string, unknown>;
              }
            }

            // Prefer dedupe by wamid when present (avoids duplicates across tables)
            const wamid =
              parsedMetadata &&
                typeof (parsedMetadata as any).wamid === "string"
                ? String((parsedMetadata as any).wamid)
                : null;
            const dedupeKey = wamid ? `wamid:${wamid}` : `id:${messageId}`;

            // Check if message was already processed (deduplication)
            if (!shouldProcessMessage(dedupeKey)) {
              return; // Skip duplicate
            }

            const hasInteractive = parsedMetadata &&
              (parsedMetadata as any).interactive;
            const messageType: Message["type"] = hasInteractive
              ? "interactive"
              : data.type || "text";

            const direction: Message["direction"] =
              data.direction === "incoming" ? "incoming" : "outgoing";

            const newMessage: Message = {
              id: messageId,
              client_id: clientId,
              conversation_id: String(data.conversation_id || phone),
              phone: String(data.phone || phone),
              name: direction === "incoming" ? "Cliente" : "Bot",
              content: cleanMessageContent(data.content || ""),
              type: messageType,
              direction,
              status: (data.status || "sent") as Message["status"],
              timestamp: data.timestamp || new Date().toISOString(),
              metadata: parsedMetadata,
              transcription: data.transcription || null,
              audio_duration_seconds: data.audio_duration_seconds || null,
            };

            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage);
            }
          } catch (error) {
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          try {
            const data = payload.new as any;

            if (!data || data.phone !== phone) return;
            if (!data.status) return;

            const messageId = data.id?.toString();
            if (!messageId) return;

            let parsedMetadata: Record<string, unknown> | null = null;
            if (data.metadata) {
              if (typeof data.metadata === "string") {
                try {
                  parsedMetadata = JSON.parse(data.metadata);
                } catch {
                  parsedMetadata = null;
                }
              } else if (typeof data.metadata === "object") {
                parsedMetadata = data.metadata as Record<string, unknown>;
              }
            }

            const errorDetails = parsedMetadata
              ? (parsedMetadata as any).error_details
              : undefined;
            const statusUpdatedAt = parsedMetadata
              ? (parsedMetadata as any).status_updated_at
              : undefined;

            if (onMessageUpdateRef.current) {
              onMessageUpdateRef.current({
                messageId,
                status: data.status,
                errorDetails,
                statusUpdatedAt,
              });
            }
          } catch (error) {
            // Silent fail for status updates
          }
        },
      )
      .subscribe((status, err) => {
        isReconnectingRef.current = false;
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [clientId, phone, shouldProcessMessage]);

  // Debounced reconnection - prevents race conditions on mobile
  const scheduleReconnect = useCallback(() => {
    // Already reconnecting or scheduled
    if (isReconnectingRef.current || reconnectTimeoutRef.current) {
      return;
    }

    // Channel is still connected
    if (channelRef.current?.state !== "closed") {
      return;
    }

    // Schedule reconnection with 500ms debounce
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;

      // Double-check conditions before reconnecting
      if (
        !isReconnectingRef.current && channelRef.current?.state === "closed"
      ) {
        hasAttemptedRef.current = false;
        setupRealtimeSubscription();
      }
    }, 500);
  }, [setupRealtimeSubscription]);

  // Setup inicial e cleanup
  useEffect(() => {
    if (!clientId || !phone) return;

    // Capture ref value for cleanup
    const processedMessageIds = processedMessageIdsRef.current;

    // Clear processed message IDs when conversation changes
    processedMessageIds.clear();

    setupRealtimeSubscription();

    return () => {
      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const channel = channelRef.current;

      if (channel) {
        try {
          const supabase = createClientBrowser();
          supabase.removeChannel(channel);
        } catch (e) {
          // Ignore errors on cleanup
        }
        channelRef.current = null;
        setIsConnected(false);
        hasAttemptedRef.current = false;
        isReconnectingRef.current = false;
      }

      // Clear processed message IDs on cleanup (use captured value)
      processedMessageIds.clear();
    };
  }, [clientId, phone, setupRealtimeSubscription]);

  // Mobile: App lifecycle - uses debounced reconnect
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appStateListener = App.addListener(
      "appStateChange",
      (state: { isActive: boolean }) => {
        if (state.isActive) {
          scheduleReconnect();
        }
      },
    );

    return () => {
      appStateListener.then((listener: any) => listener.remove());
    };
  }, [scheduleReconnect]);

  // Mobile: Network changes - uses debounced reconnect
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const networkListener = Network.addListener(
      "networkStatusChange",
      (status: { connected: boolean }) => {
        if (status.connected) {
          scheduleReconnect();
        }
      },
    );

    return () => {
      networkListener.then((listener: any) => listener.remove());
    };
  }, [scheduleReconnect]);

  return { isConnected };
};
