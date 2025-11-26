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
 */
export const useRealtimeMessages = ({
  clientId,
  phone,
  onNewMessage,
}: UseRealtimeMessagesOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const onNewMessageRef = useRef(onNewMessage);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasAttemptedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  // Keep the callback ref up to date
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  // Setup da subscription - UMA VEZ, sem retry loops
  const setupRealtimeSubscription = useCallback(() => {
    if (!clientId || !phone || hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

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
          filter: `session_id=eq.${phone}`,
        },
        (payload) => {
          try {
            const data = payload.new as any;

            // Filter by session_id (phone) - garantir que é a conversa certa
            if (data.session_id !== phone) {
              return;
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

            const newMessage: Message = {
              id: data.id?.toString() || `msg-${Date.now()}`,
              client_id: clientId,
              conversation_id: String(phone),
              phone: phone,
              name: messageType === "human" ? "Cliente" : "Bot",
              content: cleanedContent,
              type: "text",
              direction: messageType === "human" ? "incoming" : "outgoing",
              status: "sent",
              timestamp: data.created_at || new Date().toISOString(),
              metadata: null,
            };

            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage);
            }
          } catch (error) {
            console.error("[Realtime] Error processing message:", error);
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
  }, [clientId, phone]);

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
      if (!isReconnectingRef.current && channelRef.current?.state === "closed") {
        console.log("🔄 [Realtime] Reconnecting after debounce...");
        hasAttemptedRef.current = false;
        setupRealtimeSubscription();
      }
    }, 500);
  }, [setupRealtimeSubscription]);

  // Setup inicial e cleanup
  useEffect(() => {
    if (!clientId || !phone) return;

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
    };
  }, [clientId, phone, setupRealtimeSubscription]);

  // Mobile: App lifecycle - uses debounced reconnect
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appStateListener = App.addListener(
      "appStateChange",
      (state: { isActive: boolean }) => {
        if (state.isActive) {
          console.log("📱 [Realtime] App resumed, scheduling reconnect check...");
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
          console.log("📶 [Realtime] Network connected, scheduling reconnect check...");
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
