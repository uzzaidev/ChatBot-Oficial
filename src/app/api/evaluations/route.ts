import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/evaluations?verdict=PASS&minScore=7&maxScore=10&from=ISO&to=ISO&limit=50&offset=0
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = await createRouteHandlerClient(request);
    const params = request.nextUrl.searchParams;

    const verdict = params.get("verdict");
    const from = params.get("from");
    const to = params.get("to");
    const limit = Math.min(Number(params.get("limit") ?? "50"), 200);
    const offset = Number(params.get("offset") ?? "0");

    const minScore = params.get("minScore");
    const maxScore = params.get("maxScore");

    let query = (supabase as any)
      .from("agent_evaluations")
      .select(
        `id, trace_id, client_id, ground_truth_id, judge_model, judge_prompt_version,
         alignment_score, relevance_score, finality_score, safety_score, composite_score,
         verdict, tokens_input, tokens_output, cost_usd, duration_ms, evaluated_at`
      )
      .eq("client_id", clientId)
      .order("evaluated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (verdict) query = query.eq("verdict", verdict);
    if (from) query = query.gte("evaluated_at", from);
    if (to) query = query.lte("evaluated_at", to);
    if (minScore) query = query.gte("composite_score", Number(minScore));
    if (maxScore) query = query.lte("composite_score", Number(maxScore));

    const { data, error } = await query;
    if (error) {
      const message = String(error.message ?? "").toLowerCase();
      if (message.includes("does not exist") || message.includes("relation")) {
        return NextResponse.json(
          {
            error: "evaluations_table_missing",
            hint: "Apply migration 20260506120000_create_agent_evaluations.sql",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    const rows = (data ?? []) as Array<{ trace_id: string } & Record<string, any>>;
    const traceIds = rows.map((row) => row.trace_id).filter(Boolean);
    let reviewedTraceIds = new Set<string>();

    if (traceIds.length > 0) {
      const { data: feedbackRows } = await (supabase as any)
        .from("human_feedback")
        .select("trace_id")
        .eq("client_id", clientId)
        .in("trace_id", traceIds);

      reviewedTraceIds = new Set(
        (feedbackRows ?? []).map((row: { trace_id: string }) => row.trace_id),
      );
    }

    return NextResponse.json({
      data: rows.map((row) => ({
        ...row,
        has_human_feedback: reviewedTraceIds.has(row.trace_id),
      })),
      meta: {
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[GET /api/evaluations]", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

