import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const toSafeInt = (
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number => {
  const n = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
};

const toVerdicts = (raw: string | null): ("FAIL" | "REVIEW")[] => {
  if (!raw) return ["FAIL", "REVIEW"];
  const value = raw.trim().toUpperCase();
  if (value === "FAIL") return ["FAIL"];
  if (value === "REVIEW") return ["REVIEW"];
  return ["FAIL", "REVIEW"];
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const lookbackDays = toSafeInt(sp.get("lookbackDays"), 14, 1, 90);
    const limit = toSafeInt(sp.get("limit"), 100, 1, 300);
    const verdicts = toVerdicts(sp.get("verdict"));
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const result = await query<{
      evaluation_id: string;
      trace_id: string;
      evaluation_created_at: string;
      verdict: "FAIL" | "REVIEW";
      trace_status: string;
      score_sum_0_to_4: number;
      user_msg_180: string;
      bot_msg_220: string;
    }>(
      `
      WITH reviewable AS (
        SELECT
          ae.id AS evaluation_id,
          ae.trace_id,
          ae.created_at AS evaluation_created_at,
          ae.verdict,
          ae.score_relevance,
          ae.score_factuality,
          ae.score_safety,
          ae.score_clarity,
          mt.status AS trace_status,
          LEFT(COALESCE(mt.user_message, ''), 180) AS user_msg_180,
          LEFT(COALESCE(mt.agent_response, ''), 220) AS bot_msg_220
        FROM public.agent_evaluations ae
        JOIN public.message_traces mt
          ON mt.id = ae.trace_id
        WHERE ae.client_id = $1::uuid
          AND ae.created_at >= $2::timestamptz
          AND ae.verdict = ANY($3::text[])
      )
      SELECT
        r.evaluation_id,
        r.trace_id,
        r.evaluation_created_at,
        r.verdict,
        r.trace_status,
        ROUND(
          COALESCE(r.score_relevance, 0) +
          COALESCE(r.score_factuality, 0) +
          COALESCE(r.score_safety, 0) +
          COALESCE(r.score_clarity, 0),
          2
        ) AS score_sum_0_to_4,
        r.user_msg_180,
        r.bot_msg_220
      FROM reviewable r
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.human_feedback hf
        WHERE hf.trace_id = r.trace_id
          AND hf.client_id = $1::uuid
      )
      ORDER BY r.evaluation_created_at DESC
      LIMIT $4::int
      `,
      [clientId, since, verdicts, limit],
    );

    return NextResponse.json({
      data: result.rows ?? [],
      meta: {
        lookbackDays,
        limit,
        verdicts,
        total: result.rows?.length ?? 0,
      },
    });
  } catch (error) {
    const message = String((error as Error)?.message ?? "").toLowerCase();
    if (message.includes("does not exist") || message.includes("relation")) {
      return NextResponse.json(
        {
          error: "quality_tables_missing",
          hint: "Apply Sprint 3 and Sprint 4 migrations before using review queue.",
        },
        { status: 503 },
      );
    }

    console.error("[GET /api/evaluations/review-queue]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
