import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type TableHealth = {
  table: "message_traces" | "retrieval_traces" | "tool_call_traces";
  ok: boolean;
  count: number | null;
  error: string | null;
};

const checkTraceTable = async (
  admin: ReturnType<typeof createServiceRoleClient>,
  table: TableHealth["table"],
  clientId: string,
): Promise<TableHealth> => {
  const { count, error } = await (admin as any)
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);

  return {
    table,
    ok: !error,
    count: count ?? null,
    error: error?.message ?? null,
  };
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request);
    const clientId = await getClientIdFromSession(request);

    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, client_id")
      .eq("id", user?.id ?? "")
      .maybeSingle();

    const admin = createServiceRoleClient();

    const [messageTable, retrievalTable, toolTable, latestTrace] = await Promise.all([
      checkTraceTable(admin, "message_traces", clientId),
      checkTraceTable(admin, "retrieval_traces", clientId),
      checkTraceTable(admin, "tool_call_traces", clientId),
      (admin as any)
        .from("message_traces")
        .select("id, created_at, status, phone, whatsapp_message_id")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const tables = [messageTable, retrievalTable, toolTable];
    const missingTables = tables.filter(
      (t) =>
        (t.error ?? "").toLowerCase().includes("does not exist") ||
        (t.error ?? "").toLowerCase().includes("relation"),
    );

    const actions: string[] = [];
    if (missingTables.length > 0) {
      actions.push(
        "Aplicar migration 20260422130000_create_observability_traces.sql no ambiente atual.",
      );
    }
    if (!profile?.client_id) {
      actions.push(
        "Corrigir vinculo do usuario em user_profiles (client_id ausente/invalido).",
      );
    }
    if ((messageTable.count ?? 0) === 0 && missingTables.length === 0) {
      actions.push(
        "Enviar uma mensagem real no WhatsApp e conferir logs [trace-logger] no backend.",
      );
      actions.push(
        "Se continuar zerado, validar se processChatbotMessage esta sendo executado para esse tenant.",
      );
    }

    const summary =
      missingTables.length > 0
        ? "degraded"
        : (messageTable.count ?? 0) > 0
          ? "healthy"
          : "warning";

    return NextResponse.json({
      summary,
      clientId,
      userId: user?.id ?? null,
      userProfile: {
        found: !!profile,
        clientId: profile?.client_id ?? null,
        error: profileError?.message ?? null,
      },
      tables,
      latestTrace: latestTrace.data ?? null,
      latestTraceError: latestTrace.error?.message ?? null,
      actions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "internal_server_error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
