import { createServiceRoleClient } from "@/lib/supabase";
import { getFirebaseMessaging } from "@/lib/firebase-admin";

type IncomingPushParams = {
  clientId: string;
  phone: string;
  customerName?: string | null;
  messagePreview: string;
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

export const sendIncomingMessagePush = async ({
  clientId,
  phone,
  customerName,
  messagePreview,
}: IncomingPushParams): Promise<void> => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn("[push] Firebase messaging unavailable");
      return;
    }

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
    if (!users || users.length === 0) {
      console.info("[push] No active users found for client", { clientId });
      return;
    }

    const userIds = users.map((u: { id: string }) => u.id);
    const { data: pushTokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", userIds);

    if (tokensError) {
      console.warn("[push] Failed to fetch push tokens", { clientId, tokensError });
      return;
    }
    if (!pushTokens || pushTokens.length === 0) {
      console.info("[push] No push tokens found for client", { clientId, users: userIds.length });
      return;
    }

    const uniqueTokens: string[] = Array.from(
      new Set(
        pushTokens
          .map((item: { token?: string | null }) => item.token || "")
          .filter(Boolean),
      ),
    ) as string[];

    if (uniqueTokens.length === 0) return;

    const title = customerName
      ? `Nova mensagem de ${customerName}`
      : "Nova mensagem";
    const body = messagePreview.slice(0, 140);

    const response = await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: { title, body },
      data: {
        type: "message",
        phone,
      },
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    console.info("[push] Multicast processed", {
      clientId,
      tokens: uniqueTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      phone,
    });

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
