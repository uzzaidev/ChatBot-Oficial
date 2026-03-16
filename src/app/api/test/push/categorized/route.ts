import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import {
  sendBatchCategorizedPush,
  sendBudgetAlertNotification,
  sendCategorizedPush,
  sendHumanHandoffNotification,
  sendIncomingMessagePush,
} from "@/lib/push-dispatch";
import type { NotificationCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

type Mode =
  | "categorized"
  | "incoming"
  | "handoff"
  | "budget"
  | "batch";

type AuthSuccess = { ok: true };
type AuthFailure = { ok: false; status: number; error: string };
type AuthResult = AuthSuccess | AuthFailure;

const isCategory = (value: unknown): value is NotificationCategory => {
  return (
    value === "critical" ||
    value === "important" ||
    value === "normal" ||
    value === "low" ||
    value === "marketing"
  );
};

const authorizeTestRoute = async (
  request: NextRequest,
): Promise<AuthResult> => {
  const configuredSecret = process.env.PUSH_TEST_SECRET;
  const requestSecret = request.headers.get("x-push-test-secret");

  if (configuredSecret && requestSecret === configuredSecret) {
    return { ok: true };
  }

  try {
    const authClient = await createRouteHandlerClient(request);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        status: 401,
        error:
          "Unauthorized. Authenticate as admin/client_admin or provide x-push-test-secret.",
      };
    }

    const supabase = createServiceRoleClient() as any;
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        ok: false,
        status: 403,
        error: "Profile not found for authenticated user.",
      };
    }

    if (!["admin", "client_admin"].includes(profile.role)) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden. Only admin/client_admin can use this test route.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 401,
      error:
        "Unauthorized. Authenticate as admin/client_admin or provide x-push-test-secret.",
    };
  }
};

const isAuthFailure = (value: AuthResult): value is AuthFailure => {
  return value.ok === false;
};

const resolveClientIdFromUser = async (
  userId: string,
): Promise<string | null> => {
  const supabase = createServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("client_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data?.client_id as string | undefined) || null;
};

const resolveClientIdFromUsers = async (
  userIds: string[],
): Promise<string | null> => {
  if (!Array.isArray(userIds) || userIds.length === 0) return null;

  const supabase = createServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, client_id")
    .in("id", userIds);

  if (error || !Array.isArray(data) || data.length === 0) return null;

  const first = data[0]?.client_id;
  if (!first) return null;

  const allSameClient = data.every(
    (row: { client_id: string | null }) => row.client_id === first,
  );

  return allSameClient ? first : null;
};

export async function GET(request: NextRequest) {
  const auth = await authorizeTestRoute(request);
  if (isAuthFailure(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const includeTargets =
    request.nextUrl.searchParams.get("targets") === "1" ||
    request.nextUrl.searchParams.get("targets") === "true";

  if (!includeTargets) {
  return NextResponse.json({
    endpoint: "/api/test/push/categorized",
    method: "POST",
    modes: ["categorized", "incoming", "handoff", "budget", "batch"],
    examples: {
      categorized: {
        mode: "categorized",
        userId: "auth-user-uuid",
        category: "critical",
        title: "Teste crítico",
        body: "Push de teste",
      },
      incoming: {
        mode: "incoming",
        clientId: "client-uuid",
        phone: "5511999999999",
        customerName: "Cliente Teste",
        messagePreview: "Mensagem de teste",
      },
      handoff: {
        mode: "handoff",
        clientId: "client-uuid",
        phone: "5511999999999",
        customerName: "Cliente Teste",
      },
      budget: {
        mode: "budget",
        userId: "auth-user-uuid",
        percentUsed: 85,
        limitBrl: 100,
      },
      batch: {
        mode: "batch",
        userIds: ["auth-user-uuid-1", "auth-user-uuid-2"],
        category: "important",
        title: "Aviso",
        body: "Teste em lote",
      },
    },
    auth: {
      required: true,
      methods: [
        "session admin/client_admin",
        "x-push-test-secret (when PUSH_TEST_SECRET is configured)",
      ],
    },
  });
  }

  try {
    const supabase = createServiceRoleClient() as any;

    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, client_id, email, is_active")
      .eq("is_active", true)
      .limit(100);

    if (profilesError) {
      return NextResponse.json(
        {
          error: "Failed to list user_profiles",
          details: profilesError.message,
        },
        { status: 500 },
      );
    }

    const userIds = Array.isArray(profiles)
      ? profiles.map((profile: { id: string }) => profile.id)
      : [];

    const tokenCountByUser = new Map<string, number>();
    if (userIds.length > 0) {
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("user_id")
        .in("user_id", userIds);

      if (Array.isArray(tokens)) {
        for (const token of tokens) {
          const userId = token?.user_id as string | undefined;
          if (!userId) continue;
          tokenCountByUser.set(userId, (tokenCountByUser.get(userId) || 0) + 1);
        }
      }
    }

    const targets = (profiles || []).map(
      (profile: {
        id: string;
        client_id: string | null;
        email?: string;
        is_active: boolean;
      }) => ({
        userId: profile.id,
        clientId: profile.client_id,
        email: profile.email || null,
        active: profile.is_active,
        pushTokens: tokenCountByUser.get(profile.id) || 0,
      }),
    );

    return NextResponse.json({
      endpoint: "/api/test/push/categorized",
      mode: "targets",
      count: targets.length,
      targets,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to list push targets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTestRoute(request);
  if (isAuthFailure(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const mode: Mode = body?.mode || "categorized";

    if (mode === "categorized") {
      const userId = body?.userId as string | undefined;
      const category = body?.category;
      const title = body?.title as string | undefined;
      const messageBody = body?.body as string | undefined;
      const explicitClientId = body?.clientId as string | undefined;

      if (!userId || !isCategory(category) || !title || !messageBody) {
        return NextResponse.json(
          {
            error:
              "For mode=categorized provide: userId, category, title, body",
          },
          { status: 400 },
        );
      }

      const clientId =
        explicitClientId || (await resolveClientIdFromUser(userId)) || undefined;

      const result = await sendCategorizedPush(
        userId,
        {
          category,
          title,
          body: messageBody,
          data: {
            type: "manual_test",
            source: "api_test_push_categorized",
          },
        },
        { clientId },
      );

      return NextResponse.json({ success: true, mode, result });
    }

    if (mode === "incoming") {
      const clientId = body?.clientId as string | undefined;
      const phone = body?.phone as string | undefined;
      const customerName = body?.customerName as string | undefined;
      const messagePreview = body?.messagePreview as string | undefined;

      if (!clientId || !phone || !messagePreview) {
        return NextResponse.json(
          {
            error:
              "For mode=incoming provide: clientId, phone, messagePreview",
          },
          { status: 400 },
        );
      }

      await sendIncomingMessagePush({
        clientId,
        phone,
        customerName,
        messagePreview,
      });

      return NextResponse.json({ success: true, mode });
    }

    if (mode === "handoff") {
      const clientId = body?.clientId as string | undefined;
      const phone = body?.phone as string | undefined;
      const customerName = body?.customerName as string | undefined;

      if (!clientId || !phone) {
        return NextResponse.json(
          { error: "For mode=handoff provide: clientId, phone" },
          { status: 400 },
        );
      }

      const supabase = createServiceRoleClient() as any;
      const { data: users, error } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch active users", details: error.message },
          { status: 500 },
        );
      }

      const userIds = Array.isArray(users)
        ? users.map((user: { id: string }) => user.id)
        : [];

      if (userIds.length === 0) {
        return NextResponse.json(
          { error: "No active users found for client" },
          { status: 404 },
        );
      }

      const result = await sendHumanHandoffNotification(
        userIds,
        phone,
        customerName,
        clientId,
      );

      return NextResponse.json({ success: true, mode, users: userIds.length, result });
    }

    if (mode === "budget") {
      const userId = body?.userId as string | undefined;
      const percentUsed = Number(body?.percentUsed ?? 0);
      const explicitClientId = body?.clientId as string | undefined;
      const explicitLimitBrl = body?.limitBrl;

      if (!userId || Number.isNaN(percentUsed)) {
        return NextResponse.json(
          {
            error:
              "For mode=budget provide: userId, percentUsed (number). limitBrl is optional",
          },
          { status: 400 },
        );
      }

      const clientId =
        explicitClientId || (await resolveClientIdFromUser(userId)) || undefined;

      let limitBrl = Number(explicitLimitBrl);
      if (Number.isNaN(limitBrl)) {
        limitBrl = 0;
      }

      if (!limitBrl && clientId) {
        const supabase = createServiceRoleClient() as any;
        const { data: budget } = await supabase
          .from("client_budgets")
          .select("brl_limit")
          .eq("client_id", clientId)
          .maybeSingle();

        limitBrl = Number(budget?.brl_limit || 0);
      }

      const result = await sendBudgetAlertNotification(
        userId,
        percentUsed,
        limitBrl,
        clientId,
      );

      return NextResponse.json({ success: true, mode, result });
    }

    if (mode === "batch") {
      const userIds = Array.isArray(body?.userIds) ? body.userIds : [];
      const category = body?.category;
      const title = body?.title as string | undefined;
      const messageBody = body?.body as string | undefined;
      const explicitClientId = body?.clientId as string | undefined;

      if (
        userIds.length === 0 ||
        !isCategory(category) ||
        !title ||
        !messageBody
      ) {
        return NextResponse.json(
          {
            error:
              "For mode=batch provide: userIds[], category, title, body",
          },
          { status: 400 },
        );
      }

      const clientId =
        explicitClientId ||
        (await resolveClientIdFromUsers(userIds)) ||
        undefined;

      const result = await sendBatchCategorizedPush(
        userIds,
        {
          category,
          title,
          body: messageBody,
          data: {
            type: "manual_batch_test",
            source: "api_test_push_categorized",
          },
        },
        { clientId },
      );

      return NextResponse.json({ success: true, mode, result });
    }

    return NextResponse.json({ error: `Unsupported mode: ${mode}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send test push",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
