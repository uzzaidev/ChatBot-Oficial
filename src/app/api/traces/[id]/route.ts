import { createServiceRoleClient } from "@/lib/supabase";
import { query as pgQuery } from "@/lib/postgres";
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

    let contactName: string | null = null;
    let feedbackCount = 0;

    try {
      const contact = await pgQuery<{ name: string | null }>(
        `
        SELECT nome AS name
        FROM clientes_whatsapp
        WHERE client_id = $1
          AND regexp_replace(telefone::text, '\\D', '', 'g') = regexp_replace($2::text, '\\D', '', 'g')
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
        `,
        [clientId, trace.phone],
      );
      contactName = contact.rows[0]?.name?.trim() || null;
    } catch (contactError) {
      console.warn("[GET /api/traces/[id]] contact lookup failed", {
        clientId,
        error:
          contactError instanceof Error
            ? contactError.message
            : String(contactError),
      });
    }

    try {
      const feedback = await pgQuery<{ count: number }>(
        `
        SELECT COUNT(*)::int AS count
        FROM public.message_feedback
        WHERE client_id = $1
          AND trace_id = $2
        `,
        [clientId, id],
      );
      feedbackCount = Number(feedback.rows[0]?.count ?? 0);
    } catch (feedbackError) {
      const msg =
        feedbackError instanceof Error
          ? feedbackError.message
          : String(feedbackError);
      if (!msg.toLowerCase().includes("message_feedback")) {
        console.warn("[GET /api/traces/[id]] feedback lookup failed", {
          clientId,
          error: msg,
        });
      }
    }

    return NextResponse.json({
      data: {
        ...trace,
        contact_name: contactName,
        feedback_count: feedbackCount,
        has_feedback: feedbackCount > 0,
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
