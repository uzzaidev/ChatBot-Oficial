import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/evaluations/[traceId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> },
) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { traceId } = await params;
    const supabase = await createRouteHandlerClient(request);

    const { data: evaluation, error: evalError } = await (supabase as any)
      .from("agent_evaluations")
      .select("*")
      .eq("trace_id", traceId)
      .eq("client_id", clientId)
      .single();

    if (evalError || !evaluation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: trace } = await (supabase as any)
      .from("message_traces")
      .select(
        "id, user_message, agent_response, phone, status, model_used, created_at, sent_at",
      )
      .eq("id", traceId)
      .eq("client_id", clientId)
      .maybeSingle();

    return NextResponse.json({
      data: {
        ...evaluation,
        trace: trace ?? null,
      },
    });
  } catch (error) {
    console.error("[GET /api/evaluations/[traceId]]", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

