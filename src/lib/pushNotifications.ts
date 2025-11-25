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
 */

"use client";

import { PushNotifications } from "@capacitor/push-notifications";
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
    // 1. Solicitar permissão (Android 13+)
    const permissionResult = await PushNotifications.requestPermissions();

    if (permissionResult.receive === "granted") {
      // 2. Registrar para receber notificações
      await PushNotifications.register();
    } else {
      console.warn(
        "[Push Notifications] Permissão negada:",
        permissionResult.receive,
      );
      return;
    }

    // 3. Configurar listeners
    setupListeners();
  } catch (error) {
    console.error("[Push Notifications] Erro ao inicializar:", error);
  }
};

/**
 * Configura listeners de eventos de push notifications
 */
const setupListeners = () => {
  // Listener: Token registrado com sucesso
  PushNotifications.addListener("registration", async (token) => {
    // Salvar token no backend(Supabase)
    await saveTokenToBackend(token.value);
  });

  // Listener: Erro ao registrar token
  PushNotifications.addListener("registrationError", (error) => {
    console.error("[Push Notifications] Erro ao registrar token:", error);
  });

  // Listener: Notificação recebida (app em foreground)
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    // Aqui você pode mostrar uma notificação customizada ou atualizar UI
    // Por padrão, Android mostra automaticamente se app está em background
  });

  // Listener: Usuário clicou na notificação (app em background ou fechado)
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    // Processar ação (ex: navegar para chat específico)
    handleNotificationAction(action);
  });
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
      console.warn(
        "[Push Notifications] Usuário não autenticado, token não será salvo",
      );
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
      console.error("[Push Notifications] Erro ao salvar token:", upsertError);
    }
  } catch (error) {
    console.error("[Push Notifications] Erro ao salvar token:", error);
  }
};

/**
 * Processa ação quando usuário clica em notificação
 */
const handleNotificationAction = (action: any) => {
  try {
    const notification = action.notification;
    const data = notification.data || {};

    // Exemplo: Se notificação tem chat_id, navegar para chat
    if (data.chat_id) {
      window.location.href = `/dashboard/chat/${data.chat_id}`;
    } else if (data.type === "message") {
      // Navegar para lista de conversas
      window.location.href = "/dashboard/conversations";
    } else {
      // Navegar para dashboard
      window.location.href = "/dashboard";
    }
  } catch (error) {
    console.error("[Push Notifications] Erro ao processar ação:", error);
    // Fallback: navegar para dashboard
    window.location.href = "/dashboard";
  }
};

/**
 * Remove listeners (cleanup)
 * Útil para remover listeners quando componente desmonta
 */
export const removePushNotificationListeners = () => {
  if (Capacitor.isNativePlatform()) {
    PushNotifications.removeAllListeners();
  }
};
