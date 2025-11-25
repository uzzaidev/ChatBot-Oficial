import { useCallback, useEffect, useRef, useState } from "react";
import { createClientBrowser } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

// Imports condicionais para mobile
let App: any;
let Network: any;

if (Capacitor.isNativePlatform()) {
  App = require("@capacitor/app").App;
  Network = require("@capacitor/network").Network;
}

export interface ConversationUpdate {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  conversation: any;
  old?: any;
}

interface UseRealtimeConversationsOptions {
  clientId: string;
  onConversationUpdate: (update: ConversationUpdate) => void;
}

/**
 * Hook de Realtime usando Broadcast (FREE tier compatible)
 *
 * Escuta eventos broadcast enviados por triggers do banco de dados.
 * Sem retry loops - tenta conectar uma vez, se falhar aceita e para.
 * Fallback para polling já está implementado em useConversations.
 *
 * Eventos capturados:
 * - INSERT: Nova conversa criada
 * - UPDATE: Conversa atualizada (última mensagem, status, etc)
 * - DELETE: Conversa removida (raro)
 */
export const useRealtimeConversations = ({
  clientId,
  onConversationUpdate,
}: UseRealtimeConversationsOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasAttemptedRef = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    onConversationUpdateRef.current = onConversationUpdate;
  }, [onConversationUpdate]);

  // Setup da subscription - UMA VEZ, sem retry loops
  const setupRealtimeSubscription = useCallback(() => {
    if (!clientId || hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    const supabase = createClientBrowser();
    const channelName = `conversations:${clientId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          private: false,
        },
      })
      // Escutar mudanças em clientes_whatsapp (status, etc)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "clientes_whatsapp",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          try {
            const update: ConversationUpdate = {
              eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
              conversation: payload.new,
              old: payload.old,
            };

            if (onConversationUpdateRef.current) {
              onConversationUpdateRef.current(update);
            }
          } catch (error) {
            console.error(
              "❌ [Realtime Conversations] Error processing clientes_whatsapp:",
              error,
            );
          }
        },
      )
      // Escutar novas mensagens em n8n_chat_histories
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "n8n_chat_histories",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          try {
            const data = payload.new as any;
            const phone = data.session_id;

            // Criar um update fake de UPDATE para triggerar refetch
            const update: ConversationUpdate = {
              eventType: "UPDATE",
              conversation: {
                telefone: phone,
                client_id: clientId,
                // Outros campos virão do refetch
              },
              old: null,
            };

            if (onConversationUpdateRef.current) {
              onConversationUpdateRef.current(update);
            }
          } catch (error) {
            console.error(
              "❌ [Realtime Conversations] Error processing n8n_chat_histories:",
              error,
            );
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [clientId]);

  // Setup inicial e cleanup
  useEffect(() => {
    if (!clientId) return;

    setupRealtimeSubscription();

    return () => {
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
      }
    };
  }, [clientId, setupRealtimeSubscription]);

  // Mobile: App lifecycle - só reconecta se canal foi fechado
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appStateListener = App.addListener(
      "appStateChange",
      (state: { isActive: boolean }) => {
        if (state.isActive && channelRef.current?.state === "closed") {
          console.log(
            "🔄 [Realtime Conversations] App resumed, channel was closed. Reconnecting...",
          );
          hasAttemptedRef.current = false;
          setupRealtimeSubscription();
        }
      },
    );

    return () => {
      appStateListener.then((listener: any) => listener.remove());
    };
  }, [setupRealtimeSubscription]);

  // Mobile: Network changes - só reconecta se canal foi fechado
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const networkListener = Network.addListener(
      "networkStatusChange",
      (status: { connected: boolean }) => {
        if (status.connected && channelRef.current?.state === "closed") {
          console.log(
            "🔄 [Realtime Conversations] Network reconnected, channel was closed. Reconnecting...",
          );
          hasAttemptedRef.current = false;
          setupRealtimeSubscription();
        }
      },
    );

    return () => {
      networkListener.then((listener: any) => listener.remove());
    };
  }, [setupRealtimeSubscription]);

  return { isConnected };
};
