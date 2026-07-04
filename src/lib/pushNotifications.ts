/**
 * Push Notifications - Firebase Cloud Messaging (FCM)
 *
 * Gerencia registro de tokens e recebimento de notificações push.
 *
 * Fluxo:
 * 1. App registra device token → Firebase
 * 2. Token é salvo no backend (Supabase) associado ao user_id
 * 3. Backend envia notificação → Firebase → Device
 * 4. App recebe e processa notificação
 *
 * IMPORTANTE: usa @capacitor-firebase/messaging (não @capacitor/push-notifications).
 * No iOS, @capacitor/push-notifications retorna o token APNs cru, que não é
 * aceito pelo backend de envio (FCM HTTP v1 via firebase-admin, ver
 * src/lib/push-dispatch.ts) — o token era salvo mas todo envio ao iOS falhava
 * silenciosamente e o token acabava removido como "inválido". O plugin
 * @capacitor-firebase/messaging troca o token APNs pelo token FCM internamente,
 * então Android e iOS salvam o mesmo formato de token.
 */

"use client";

import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { createBrowserClient } from "@/lib/supabase-browser";

/**
 * Inicializa push notifications
 * Deve ser chamado no app startup (layout.tsx)
 */
export const initPushNotifications = async () => {
  // Apenas em mobile (não funciona na web)
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. Solicitar permissão (Android 13+ / iOS)
    const permissionResult = await FirebaseMessaging.requestPermissions();

    if (permissionResult.receive !== "granted") {
      return;
    }

    // 2. Configurar listeners (inclui o de token, que substitui o "register")
    setupListeners();

    // 3. Obter token FCM atual e salvar
    const { token } = await FirebaseMessaging.getToken();
    if (token) {
      await saveTokenToBackend(token);
    }
  } catch (error) {
    // Error initializing push notifications
  }
};

/**
 * Configura listeners de eventos de push notifications
 */
const setupListeners = () => {
  // Listener: token (novo ou renovado)
  FirebaseMessaging.addListener("tokenReceived", async (event) => {
    if (event.token) {
      await saveTokenToBackend(event.token);
    }
  });

  // Listener: Notificação recebida (app em foreground)
  FirebaseMessaging.addListener("notificationReceived", (event) => {
    // Mark as delivered for analytics (best effort)
    void trackNotificationEvent("delivered", event.notification?.data || {});
  });

  // Listener: Usuário clicou na notificação (app em background ou fechado)
  FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
    // Mark as opened for analytics (best effort)
    const data = event.notification?.data || {};
    void trackNotificationEvent("opened", data);

    // Processar ação (ex: navegar para chat específico)
    handleNotificationAction(event);
  });
};

const trackNotificationEvent = async (
  event: "delivered" | "opened",
  data: Record<string, any>,
) => {
  try {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    await fetch("/api/notifications/event", {
      method: "POST",
      headers,
      body: JSON.stringify({
        event,
        notification_log_id: data?.notification_log_id,
        category: data?.category,
        type: data?.type,
        phone: data?.phone || data?.conversation_phone || data?.chat_id,
        wamid: data?.wamid,
        threshold: data?.threshold,
        period_start: data?.period_start,
      }),
    });
  } catch {
    // Best effort only
  }
};

/**
 * Salva token no backend (Supabase)
 *
 * IMPORTANTE: Você precisa criar uma tabela `push_tokens` no Supabase:
 *
 * CREATE TABLE push_tokens (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   token TEXT NOT NULL UNIQUE,
 *   platform TEXT NOT NULL, -- 'android' ou 'ios'
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
 * CREATE INDEX idx_push_tokens_token ON push_tokens(token);
 */
const saveTokenToBackend = async (token: string) => {
  try {
    const supabase = createBrowserClient();

    // 1. Obter usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      // User not authenticated, token won't be saved
      return;
    }

    // 2. Detectar plataforma
    const platform = Capacitor.getPlatform(); // 'android' ou 'ios'

    // 3. Salvar/atualizar token no Supabase
    // Usar upsert para atualizar se token já existe
    const { error: upsertError } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: user.id,
          token: token,
          platform: platform,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "token", // Se token já existe, atualiza
        },
      );

    if (upsertError) {
      // Error saving token
    }

    // 4. Garantir linha de preferências de notificação para o usuário
    // (não quebra o fluxo se a migration ainda não foi aplicada)
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("client_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.client_id) {
        await (supabase as any)
          .from("notification_preferences")
          .upsert(
            {
              user_id: user.id,
              client_id: profile.client_id,
            },
            { onConflict: "user_id" },
          );
      }
    } catch {
      // Ignore (table may not exist yet)
    }
  } catch (error) {
    // Error saving token
  }
};

/**
 * Processa ação quando usuário clica em notificação
 */
const handleNotificationAction = (action: any) => {
  try {
    const notification = action.notification;
    const data = notification?.data || {};

    // Conversas usam query param (?phone=...) no app atual.
    const phone = data.phone || data.chat_id || data.conversation_phone;
    const explicitAction = data.action || data.type;

    if (explicitAction === "open_billing") {
      window.location.href = "/dashboard/billing";
    } else if (phone && (explicitAction === "open_chat" || explicitAction === "open_conversation")) {
      window.location.href = `/dashboard/chat?phone=${encodeURIComponent(phone)}`;
    } else if (phone) {
      window.location.href = `/dashboard/chat?phone=${encodeURIComponent(phone)}`;
    } else if (data.type === "message") {
      // Navegar para lista de conversas
      window.location.href = "/dashboard/conversations";
    } else {
      // Navegar para dashboard
      window.location.href = "/dashboard";
    }
  } catch (error) {
    // Fallback: navigate to dashboard
    window.location.href = "/dashboard";
  }
};

/**
 * Remove listeners (cleanup)
 * Útil para remover listeners quando componente desmonta
 */
export const removePushNotificationListeners = () => {
  if (Capacitor.isNativePlatform()) {
    FirebaseMessaging.removeAllListeners();
  }
};
