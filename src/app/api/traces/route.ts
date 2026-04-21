import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/traces?from=ISO&to=ISO&phone=X&status=Y&limit=50&offset=0
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request);
    const { searchParams } = request.nextUrl;

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const phone = searchParams.get("phone");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const offset = Number(searchParams.get("offset") ?? "0");

    // Resolve client_id using shared auth helper (supports cookie + bearer token)
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let query = (supabase as any)
      .from("message_traces")
      .select(
        `id, phone, status, user_message, agent_response, model_used,
         tokens_input, tokens_output, cost_usd,
         latency_total_ms, latency_generation_ms, latency_retrieval_ms, latency_embedding_ms,
         webhook_received_at, sent_at, created_at`
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (phone) query = query.eq("phone", phone);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      const message = String(error.message ?? "").toLowerCase();
      if (message.includes("does not exist") || message.includes("relation")) {
        return NextResponse.json(
          {
            error: "traces_tables_missing",
            hint: "Apply migration 20260422130000_create_observability_traces.sql",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    // Cost aggregation for the current day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: costData } = await (supabase as any)
      .from("message_traces")
      .select("cost_usd")
      .eq("client_id", clientId)
      .gte("created_at", today.toISOString());

    const costToday = (costData ?? []).reduce(
      (sum: number, row: { cost_usd: number | null }) =>
        sum + (row.cost_usd ?? 0),
      0
    );

    return NextResponse.json({
      data: data ?? [],
      meta: {
        limit,
        offset,
        costTodayUsd: Number(costToday.toFixed(6)),
      },
    });
  } catch (error) {
    console.error("[GET /api/traces]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
