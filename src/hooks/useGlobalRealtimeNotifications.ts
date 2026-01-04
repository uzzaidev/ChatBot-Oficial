import { useCallback, useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MessageNotification {
  phone: string;
  message: string;
  senderName?: string;
  timestamp: string;
}

interface UseGlobalRealtimeNotificationsOptions {
  clientId: string | null; // 🔐 Multi-tenant: Required for tenant isolation (null = not yet loaded)
  onNewMessage?: (notification: MessageNotification) => void;
}

// Singleton callback storage - garante que apenas um callback seja ativo
let globalCallback: ((notification: MessageNotification) => void) | null = null;

/**
 * Hook global para monitorar TODAS as mensagens em tempo real
 * Usado para mostrar notificações em conversas não abertas
 *
 * 🔐 Multi-tenant: Requires clientId to ensure tenant isolation
 * When clientId is null, the subscription is not set up (e.g., user not yet authenticated)
 */
export const useGlobalRealtimeNotifications = ({
  clientId,
  onNewMessage,
}: UseGlobalRealtimeNotificationsOptions) => {
  const [lastUpdatePhone, setLastUpdatePhone] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<
    MessageNotification | null
  >(null);
  const [isConnected, setIsConnected] = useState(false);

  // Registrar callback globalmente
  useEffect(() => {
    if (onNewMessage) {
      globalCallback = onNewMessage;

      return () => {
        globalCallback = null;
      };
    }
  }, [onNewMessage]);

  useEffect(() => {
    // 🔐 Multi-tenant: Don't setup subscription without valid clientId
    // Check for both null/undefined and empty string
    if (!clientId || clientId === "") return;

    const supabase = createClientBrowser();
    let channel: RealtimeChannel;

    const setupGlobalSubscription = async () => {
      channel = supabase
        // 🔐 Multi-tenant: Include clientId in channel name for isolation
        .channel(`global-chat-histories:${clientId}`)
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
              const item = payload.new as any;
              const phone = item.session_id;
              const timestamp = item.created_at || new Date().toISOString();

              const role: string | null = typeof item.role === "string"
                ? item.role
                : null;

              const rawMessage = item.message;
              const parsedMessage = (() => {
                if (!rawMessage) return null;
                if (typeof rawMessage === "object") return rawMessage as any;
                if (typeof rawMessage !== "string") return null;

                try {
                  return JSON.parse(rawMessage) as any;
                } catch {
                  return null;
                }
              })();

              const messageType: string | null =
                typeof parsedMessage?.type === "string"
                  ? parsedMessage.type
                  : null;

              const message: string = (() => {
                if (typeof rawMessage === "string") return rawMessage;
                if (rawMessage && typeof rawMessage === "object") {
                  try {
                    return JSON.stringify(rawMessage);
                  } catch {
                    return "";
                  }
                }
                return "";
              })();

              // Notify only for incoming messages.
              // - Prefer explicit role from n8n when available
              // - Otherwise infer from stored JSON message.type ('human' is incoming)
              const isIncoming = role === "user" || messageType === "human";

              if (phone && isIncoming) {
                setLastUpdatePhone(phone);

                const notification: MessageNotification = {
                  phone,
                  message,
                  timestamp,
                };

                setLastNotification(notification);

                // Usar callback global em vez do parâmetro
                if (globalCallback) {
                  globalCallback(notification);
                }
              }
            } catch (error) {
              // Error processing message - non-critical
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
          } else if (status === "CLOSED") {
            setIsConnected(false);
          } else if (status === "CHANNEL_ERROR") {
            // Channel error - will try to reconnect
          }
        });
    };

    setupGlobalSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        setIsConnected(false);
      }
    };
  }, [clientId]); // 🔐 Multi-tenant: Re-subscribe when clientId changes

  return {
    lastUpdatePhone,
    lastNotification,
    isConnected,
  };
};
