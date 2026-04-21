import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/evaluations/stats?from=ISO&to=ISO
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = await createRouteHandlerClient(request);
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    let query = (supabase as any)
      .from("agent_evaluations")
      .select("verdict, composite_score, cost_usd, duration_ms")
      .eq("client_id", clientId);

    if (from) query = query.gte("evaluated_at", from);
    if (to) query = query.lte("evaluated_at", to);

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

    const rows = data ?? [];
    const total = rows.length;

    const totals = rows.reduce(
      (
        acc: {
          pass: number;
          review: number;
          fail: number;
          score: number;
          cost: number;
          duration: number;
          withDuration: number;
        },
        row: {
          verdict: "PASS" | "REVIEW" | "FAIL";
          composite_score: number | null;
          cost_usd: number | null;
          duration_ms: number | null;
        },
      ) => {
        if (row.verdict === "PASS") acc.pass += 1;
        if (row.verdict === "REVIEW") acc.review += 1;
        if (row.verdict === "FAIL") acc.fail += 1;

        acc.score += row.composite_score ?? 0;
        acc.cost += row.cost_usd ?? 0;

        if (row.duration_ms != null) {
          acc.duration += row.duration_ms;
          acc.withDuration += 1;
        }

        return acc;
      },
      {
        pass: 0,
        review: 0,
        fail: 0,
        score: 0,
        cost: 0,
        duration: 0,
        withDuration: 0,
      },
    );

    const avgScore = total > 0 ? totals.score / total : 0;
    const avgDurationMs = totals.withDuration > 0 ? totals.duration / totals.withDuration : 0;

    return NextResponse.json({
      data: {
        total,
        averageScore: Number(avgScore.toFixed(4)),
        averageDurationMs: Number(avgDurationMs.toFixed(2)),
        totalCostUsd: Number(totals.cost.toFixed(6)),
        verdicts: {
          PASS: totals.pass,
          REVIEW: totals.review,
          FAIL: totals.fail,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/evaluations/stats]", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

