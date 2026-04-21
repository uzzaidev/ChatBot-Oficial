import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/traces/[id] — full trace detail with retrieval + tool_calls
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteHandlerClient(_request);
    const { id } = await params;

    const clientId = await getClientIdFromSession(_request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Fetch trace (RLS will restrict to tenant)
    const { data: trace, error: traceError } = await (supabase as any)
      .from("message_traces")
      .select("*")
      .eq("id", id)
      .eq("client_id", clientId)
      .single();

    if (traceError || !trace) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Fetch retrieval trace
    const { data: retrieval } = await (supabase as any)
      .from("retrieval_traces")
      .select(
        "chunk_ids, similarity_scores, top_k, threshold, retrieval_strategy, created_at"
      )
      .eq("trace_id", id)
      .maybeSingle();

    // Fetch tool calls (ordered by sequence)
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
    console.error("[GET /api/traces/[id]]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
