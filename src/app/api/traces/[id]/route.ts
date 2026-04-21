import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/traces/[id] — full trace detail with retrieval + tool_calls
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let clientId: string | null = null;

  try {
    const { id } = await params;

    clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data: trace, error: traceError } = await (supabase as any)
      .from("message_traces")
      .select("*")
      .eq("id", id)
      .eq("client_id", clientId)
      .single();

    if (traceError) {
      const msg = String(traceError.message ?? "").toLowerCase();
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ error: "traces_tables_missing" }, { status: 503 });
      }
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (!trace) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: retrieval } = await (supabase as any)
      .from("retrieval_traces")
      .select(
        "chunk_ids, similarity_scores, top_k, threshold, retrieval_strategy, created_at"
      )
      .eq("trace_id", id)
      .maybeSingle();

    const { data: toolCalls } = await (supabase as any)
      .from("tool_call_traces")
      .select(
        `tool_name, tool_call_id, arguments, result, status,
         error_message, sequence_index, source, latency_ms,
         started_at, completed_at`
      )
      .eq("trace_id", id)
      .order("sequence_index", { ascending: true });

    return NextResponse.json({
      data: {
        ...trace,
        retrieval: retrieval ?? null,
        tool_calls: toolCalls ?? [],
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/traces/[id]] (clientId=%s):", clientId, error);
    return NextResponse.json(
      { error: "internal_server_error", detail },
      { status: 500 }
    );
  }
}
