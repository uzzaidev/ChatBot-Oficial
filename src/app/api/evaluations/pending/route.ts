import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/evaluations/pending
// pending = evaluations FAIL/REVIEW sem feedback humano associado (por trace_id)
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = await createRouteHandlerClient(request);

    const { data: evaluations, error: evalError } = await (supabase as any)
      .from("agent_evaluations")
      .select("trace_id")
      .eq("client_id", clientId)
      .in("verdict", ["FAIL", "REVIEW"]);

    if (evalError) throw evalError;

    const traceIds = Array.from(
      new Set((evaluations ?? []).map((row: { trace_id: string }) => row.trace_id)),
    );

    if (traceIds.length === 0) {
      return NextResponse.json({
        data: {
          pendingCount: 0,
          totalReviewable: 0,
          reviewedCount: 0,
        },
      });
    }

    const { data: feedbackRows, error: feedbackError } = await (supabase as any)
      .from("human_feedback")
      .select("trace_id")
      .eq("client_id", clientId)
      .in("trace_id", traceIds);

    if (feedbackError) throw feedbackError;

    const reviewedTraceIds = new Set(
      (feedbackRows ?? []).map((row: { trace_id: string }) => row.trace_id),
    );
    const pendingCount = traceIds.filter((traceId) => !reviewedTraceIds.has(traceId))
      .length;

    return NextResponse.json({
      data: {
        pendingCount,
        totalReviewable: traceIds.length,
        reviewedCount: reviewedTraceIds.size,
      },
    });
  } catch (error) {
    const message = String((error as any)?.message ?? "").toLowerCase();
    if (message.includes("does not exist") || message.includes("relation")) {
      return NextResponse.json(
        {
          error: "quality_tables_missing",
          hint: "Apply migrations from Sprint 3 and Sprint 4 for agent_evaluations and human_feedback.",
        },
        { status: 503 },
      );
    }

    console.error("[GET /api/evaluations/pending]", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
