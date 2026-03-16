import { createServiceRoleClient } from "@/lib/supabase";
import { getFirebaseMessaging } from "@/lib/firebase-admin";
import { randomUUID } from "crypto";
import type {
  NotificationCategory,
  NotificationConfig,
  NotificationPreferences,
} from "@/lib/types";

type IncomingPushParams = {
  clientId: string;
  phone: string;
  customerName?: string | null;
  messagePreview: string;
};

type CategoryPreference = {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
};

type NotificationPreferenceRow = {
  user_id: string;
  client_id?: string | null;
  preferences?: Partial<Record<NotificationCategory, Partial<CategoryPreference>>> | null;
  dnd_enabled?: boolean | null;
  dnd_start_time?: string | null;
  dnd_end_time?: string | null;
  dnd_days?: number[] | null;
};

type PushTokenRow = {
  user_id: string;
  token: string;
  platform?: string | null;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  critical: { enabled: true, sound: true, vibration: true },
  important: { enabled: true, sound: true, vibration: true },
  normal: { enabled: true, sound: true, vibration: true },
  low: { enabled: false, sound: false, vibration: false },
  marketing: { enabled: false, sound: false, vibration: false },
};

const ANDROID_PRIORITY_MAP: Record<NotificationCategory, "high" | "normal"> = {
  critical: "high",
  important: "high",
  normal: "high",
  low: "normal",
  marketing: "normal",
};

const ANDROID_CHANNEL_MAP: Record<NotificationCategory, string> = {
  critical: "critical_notifications",
  important: "important_notifications",
  normal: "normal_messages",
  low: "low_priority",
  marketing: "marketing",
};

const IOS_INTERRUPTION_MAP: Record<NotificationCategory, "critical" | "time-sensitive" | "active" | "passive"> = {
  critical: "critical",
  important: "time-sensitive",
  normal: "active",
  low: "passive",
  marketing: "passive",
};

const removeInvalidTokens = async (tokens: string[]) => {
  if (tokens.length === 0) return;

  try {
    const supabase = createServiceRoleClient() as any;
    await supabase.from("push_tokens").delete().in("token", tokens);
  } catch (error) {
    console.warn("[push] Failed to remove invalid tokens", error);
  }
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const normalizePreferences = (
  preferences?: Partial<Record<NotificationCategory, Partial<CategoryPreference>>> | null,
): NotificationPreferences => {
  const source = preferences || {};

  return {
    critical: {
      enabled: toBoolean(source.critical?.enabled, DEFAULT_NOTIFICATION_PREFERENCES.critical.enabled),
      sound: toBoolean(source.critical?.sound, DEFAULT_NOTIFICATION_PREFERENCES.critical.sound),
      vibration: toBoolean(source.critical?.vibration, DEFAULT_NOTIFICATION_PREFERENCES.critical.vibration),
    },
    important: {
      enabled: toBoolean(source.important?.enabled, DEFAULT_NOTIFICATION_PREFERENCES.important.enabled),
      sound: toBoolean(source.important?.sound, DEFAULT_NOTIFICATION_PREFERENCES.important.sound),
      vibration: toBoolean(source.important?.vibration, DEFAULT_NOTIFICATION_PREFERENCES.important.vibration),
    },
    normal: {
      enabled: toBoolean(source.normal?.enabled, DEFAULT_NOTIFICATION_PREFERENCES.normal.enabled),
      sound: toBoolean(source.normal?.sound, DEFAULT_NOTIFICATION_PREFERENCES.normal.sound),
      vibration: toBoolean(source.normal?.vibration, DEFAULT_NOTIFICATION_PREFERENCES.normal.vibration),
    },
    low: {
      enabled: toBoolean(source.low?.enabled, DEFAULT_NOTIFICATION_PREFERENCES.low.enabled),
      sound: toBoolean(source.low?.sound, DEFAULT_NOTIFICATION_PREFERENCES.low.sound),
      vibration: toBoolean(source.low?.vibration, DEFAULT_NOTIFICATION_PREFERENCES.low.vibration),
    },
    marketing: {
      enabled: toBoolean(source.marketing?.enabled, DEFAULT_NOTIFICATION_PREFERENCES.marketing.enabled),
      sound: toBoolean(source.marketing?.sound, DEFAULT_NOTIFICATION_PREFERENCES.marketing.sound),
      vibration: toBoolean(source.marketing?.vibration, DEFAULT_NOTIFICATION_PREFERENCES.marketing.vibration),
    },
  };
};

const parseTimeToMinutes = (time: string | null | undefined): number | null => {
  if (!time || typeof time !== "string") return null;

  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const isInDNDPeriod = (
  dndEnabled: boolean,
  dndStartTime?: string | null,
  dndEndTime?: string | null,
  dndDays?: number[] | null,
): boolean => {
  if (!dndEnabled) return false;

  const start = parseTimeToMinutes(dndStartTime);
  const end = parseTimeToMinutes(dndEndTime);
  if (start === null || end === null) return false;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (Array.isArray(dndDays) && dndDays.length > 0 && !dndDays.includes(currentDay)) {
    return false;
  }

  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end;
  }

  return currentMinutes >= start || currentMinutes <= end;
};

const isTableMissingError = (error: any): boolean => {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";

  return code === "42P01" || message.includes("does not exist") || message.includes("relation");
};

const getCategoryFromRecentMessages = async (
  clientId: string,
  phone: string,
): Promise<NotificationCategory> => {
  try {
    const supabase = createServiceRoleClient() as any;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("n8n_chat_histories")
      .select("message")
      .eq("client_id", clientId)
      .eq("session_id", phone)
      .gte("created_at", since)
      .limit(10);

    if (error || !Array.isArray(data)) return "normal";

    let humanCount = 0;
    for (const row of data) {
      let parsed = row?.message;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }

      if (parsed?.type === "human") {
        humanCount += 1;
      }
    }

    return humanCount <= 1 ? "important" : "normal";
  } catch {
    return "normal";
  }
};

const getUserTokens = async (userId: string): Promise<PushTokenRow[]> => {
  const supabase = createServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("push_tokens")
    .select("user_id, token, platform")
    .eq("user_id", userId);

  if (error) {
    if (!isTableMissingError(error)) {
      console.warn("[push] Failed to fetch push tokens", { userId, error });
    }
    return [];
  }

  if (!Array.isArray(data)) return [];

  const dedup = new Map<string, PushTokenRow>();
  for (const row of data as PushTokenRow[]) {
    if (row?.token) {
      dedup.set(row.token, row);
    }
  }

  return Array.from(dedup.values());
};

const getUserNotificationSettings = async (
  userId: string,
  fallbackClientId?: string,
): Promise<{
  preferences: NotificationPreferences;
  clientId?: string;
  dndEnabled: boolean;
  dndStartTime?: string | null;
  dndEndTime?: string | null;
  dndDays?: number[] | null;
}> => {
  const supabase = createServiceRoleClient() as any;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("user_id, client_id, preferences, dnd_enabled, dnd_start_time, dnd_end_time, dnd_days")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (!isTableMissingError(error)) {
      console.warn("[push] Failed to fetch notification preferences", { userId, error });
    }

    return {
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      clientId: fallbackClientId,
      dndEnabled: false,
      dndStartTime: null,
      dndEndTime: null,
      dndDays: [],
    };
  }

  const row = data as NotificationPreferenceRow | null;

  return {
    preferences: normalizePreferences(row?.preferences),
    clientId: (row?.client_id as string | undefined) || fallbackClientId,
    dndEnabled: Boolean(row?.dnd_enabled),
    dndStartTime: row?.dnd_start_time ?? null,
    dndEndTime: row?.dnd_end_time ?? null,
    dndDays: Array.isArray(row?.dnd_days) ? row?.dnd_days : [],
  };
};

const insertNotificationLog = async (payload: {
  userId: string;
  clientId?: string;
  config: NotificationConfig;
  logId?: string;
  status: "sent" | "failed" | "skipped";
  failureReason?: string;
}) => {
  try {
    const { userId, clientId, config, logId, status, failureReason } = payload;
    if (!clientId) return;

    const supabase = createServiceRoleClient() as any;
    const dataWithTracking = {
      ...(config.data || {}),
      ...(logId ? { notification_log_id: logId } : {}),
    };

    const { error } = await supabase.from("notification_logs").insert({
      ...(logId ? { id: logId } : {}),
      user_id: userId,
      client_id: clientId,
      category: config.category,
      title: config.title,
      body: config.body,
      data: dataWithTracking,
      status,
      failure_reason: failureReason || null,
      sent_at: new Date().toISOString(),
    });

    if (error && !isTableMissingError(error)) {
      console.warn("[push] Failed to insert notification log", { userId, error });
    }
  } catch (error) {
    console.warn("[push] Failed to insert notification log", error);
  }
};

export const sendCategorizedPush = async (
  userId: string,
  config: NotificationConfig,
  options?: { clientId?: string },
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const logId = randomUUID();
  const trackedConfig: NotificationConfig = {
    ...config,
    data: {
      ...(config.data || {}),
      notification_log_id: logId,
    },
  };

  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return { success: false, error: "Firebase messaging unavailable" };
    }

    const tokens = await getUserTokens(userId);
    if (tokens.length === 0) {
      await insertNotificationLog({
        userId,
        clientId: options?.clientId,
        config: trackedConfig,
        logId,
        status: "skipped",
        failureReason: "No push tokens",
      });
      return { success: false, error: "No push tokens" };
    }

    const settings = await getUserNotificationSettings(userId, options?.clientId);
    const categoryPrefs = settings.preferences[trackedConfig.category];

    if (!categoryPrefs.enabled) {
      await insertNotificationLog({
        userId,
        clientId: settings.clientId,
        config: trackedConfig,
        logId,
        status: "skipped",
        failureReason: `Category ${trackedConfig.category} disabled`,
      });
      return { success: false, error: "Category disabled by user" };
    }

    if (
      trackedConfig.category !== "critical" &&
      isInDNDPeriod(
        settings.dndEnabled,
        settings.dndStartTime,
        settings.dndEndTime,
        settings.dndDays,
      )
    ) {
      await insertNotificationLog({
        userId,
        clientId: settings.clientId,
        config: trackedConfig,
        logId,
        status: "skipped",
        failureReason: "User in DND period",
      });
      return { success: false, error: "User in DND period" };
    }

    const uniqueTokens = Array.from(new Set(tokens.map((item) => item.token)));

    const multicastMessage: any = {
      tokens: uniqueTokens,
      notification: {
        title: trackedConfig.title,
        body: trackedConfig.body,
        imageUrl: trackedConfig.imageUrl,
      },
      data: {
        category: trackedConfig.category,
        ...(trackedConfig.data || {}),
        ...(trackedConfig.actionButtons
          ? { actions: JSON.stringify(trackedConfig.actionButtons) }
          : {}),
      },
      android: {
        priority: ANDROID_PRIORITY_MAP[trackedConfig.category],
        notification: {
          channelId: ANDROID_CHANNEL_MAP[trackedConfig.category],
          sound: categoryPrefs.sound ? "default" : undefined,
          priority: ANDROID_PRIORITY_MAP[trackedConfig.category],
          defaultVibrateTimings: categoryPrefs.vibration,
          defaultSound: categoryPrefs.sound,
        },
      },
      apns: {
        headers: {
          "apns-priority":
            trackedConfig.category === "critical" || trackedConfig.category === "important"
              ? "10"
              : "5",
        },
        payload: {
          aps: {
            alert: {
              title: trackedConfig.title,
              body: trackedConfig.body,
            },
            sound: categoryPrefs.sound ? "default" : undefined,
            badge: 1,
            "interruption-level": IOS_INTERRUPTION_MAP[trackedConfig.category],
            "relevance-score":
              trackedConfig.category === "critical"
                ? 1.0
                : trackedConfig.category === "important"
                  ? 0.8
                  : trackedConfig.category === "normal"
                    ? 0.5
                    : 0.2,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(multicastMessage);

    const invalidTokens: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const code = result.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token")
        ) {
          const invalidToken = uniqueTokens[index];
          if (invalidToken) {
            invalidTokens.push(invalidToken);
          }
        }
      }
    });

    await removeInvalidTokens(invalidTokens);

    if (response.successCount > 0) {
      await insertNotificationLog({
        userId,
        clientId: settings.clientId,
        config: trackedConfig,
        logId,
        status: "sent",
      });

      return {
        success: true,
        messageId: `${response.successCount}/${uniqueTokens.length}`,
      };
    }

    await insertNotificationLog({
      userId,
      clientId: settings.clientId,
      config: trackedConfig,
      logId,
      status: "failed",
      failureReason: "All device deliveries failed",
    });

    return { success: false, error: "All device deliveries failed" };
  } catch (error) {
    await insertNotificationLog({
      userId,
      clientId: options?.clientId,
      config: trackedConfig,
      logId,
      status: "failed",
      failureReason: error instanceof Error ? error.message : String(error),
    });

    return { success: false, error: String(error) };
  }
};

export const sendBatchCategorizedPush = async (
  userIds: string[],
  config: NotificationConfig,
  options?: { clientId?: string },
): Promise<{ sent: number; failed: number }> => {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendCategorizedPush(userId, config, options)),
  );

  const sent = results.filter(
    (result) => result.status === "fulfilled" && result.value.success,
  ).length;
  const failed = results.length - sent;

  return { sent, failed };
};

export const sendHumanHandoffNotification = async (
  userIds: string[],
  phone: string,
  customerName?: string,
  clientId?: string,
) => {
  return sendBatchCategorizedPush(
    userIds,
    {
      category: "critical",
      title: "Transferência para atendente",
      body: `${customerName || phone} solicitou atendimento humano`,
      data: {
        type: "human_handoff",
        phone,
        action: "open_chat",
      },
    },
    { clientId },
  );
};

export const sendNewMessageNotification = async (
  userId: string,
  phone: string,
  customerName: string,
  messagePreview: string,
  isFirstMessage: boolean,
  clientId?: string,
) => {
  return sendCategorizedPush(
    userId,
    {
      category: isFirstMessage ? "important" : "normal",
      title: isFirstMessage ? "Nova conversa" : `Mensagem de ${customerName}`,
      body: messagePreview.slice(0, 140),
      data: {
        type: "new_message",
        phone,
        action: "open_conversation",
      },
    },
    { clientId },
  );
};

export const sendBudgetAlertNotification = async (
  userId: string,
  percentUsed: number,
  limitBrl: number,
  clientId?: string,
  metadata?: {
    threshold?: number;
    periodStart?: string;
  },
) => {
  const isCritical = percentUsed >= 100;
  const threshold = metadata?.threshold ?? (isCritical ? 100 : 80);

  return sendCategorizedPush(
    userId,
    {
      category: isCritical ? "critical" : "important",
      title: isCritical ? "Orçamento esgotado" : "Alerta de orçamento",
      body: isCritical
        ? "Seus créditos de IA foram esgotados."
        : `Você atingiu ${percentUsed}% do orçamento (R$ ${limitBrl.toFixed(2)})`,
      data: {
        type: "budget_alert",
        percent_used: String(percentUsed),
        threshold: String(threshold),
        ...(metadata?.periodStart
          ? { period_start: metadata.periodStart }
          : {}),
        action: "open_billing",
      },
    },
    { clientId },
  );
};

export const sendIncomingMessagePush = async ({
  clientId,
  phone,
  customerName,
  messagePreview,
}: IncomingPushParams): Promise<void> => {
  try {
    const supabase = createServiceRoleClient() as any;

    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (usersError) {
      console.warn("[push] Failed to fetch users", { clientId, usersError });
      return;
    }

    if (!Array.isArray(users) || users.length === 0) {
      return;
    }

    const category = await getCategoryFromRecentMessages(clientId, phone);
    const title =
      category === "important"
        ? "Nova conversa"
        : customerName
          ? `Mensagem de ${customerName}`
          : "Nova mensagem";

    const dispatchConfig: NotificationConfig = {
      category,
      title,
      body: messagePreview.slice(0, 140),
      data: {
        type: "message",
        phone,
        action: "open_conversation",
      },
    };

    const userIds = users.map((user: { id: string }) => user.id);
    const result = await sendBatchCategorizedPush(userIds, dispatchConfig, {
      clientId,
    });

    console.info("[push] Categorized dispatch finished", {
      clientId,
      category,
      users: userIds.length,
      sent: result.sent,
      failed: result.failed,
      phone,
    });
  } catch (error) {
    console.warn("[push] Failed to send incoming message push", error);
  }
};

export const sendIncomingMessagePushWithTimeout = async (
  params: IncomingPushParams,
  timeoutMs = 1800,
): Promise<void> => {
  await Promise.race([
    sendIncomingMessagePush(params),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
};
