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

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const limit = toSafeInt(sp.get("limit"), 30, 1, 100);
    const lookbackDays = toSafeInt(sp.get("lookbackDays"), 30, 1, 180);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const res = await query<{
      trace_id: string;
      created_at: string;
      status: string;
      user_query: string;
      expected_response: string;
      similarity_key: string;
    }>(
      `
      WITH ranked AS (
        SELECT
          mt.id AS trace_id,
          mt.created_at,
          mt.status,
          BTRIM(mt.user_message) AS user_query,
          BTRIM(mt.agent_response) AS expected_response,
          LOWER(regexp_replace(BTRIM(mt.user_message), '\\s+', ' ', 'g')) AS similarity_key,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(regexp_replace(BTRIM(mt.user_message), '\\s+', ' ', 'g'))
            ORDER BY mt.created_at DESC
          ) AS rn
        FROM public.message_traces mt
        WHERE mt.client_id = $1::uuid
          AND mt.created_at >= $2::timestamptz
          AND COALESCE(NULLIF(BTRIM(mt.user_message), ''), '') <> ''
          AND COALESCE(NULLIF(BTRIM(mt.agent_response), ''), '') <> ''
          AND mt.status IN ('success', 'needs_review', 'evaluated', 'human_reviewed')
      )
      SELECT
        r.trace_id,
        r.created_at,
        r.status,
        r.user_query,
        r.expected_response,
        r.similarity_key
      FROM ranked r
      WHERE r.rn = 1
        AND NOT EXISTS (
          SELECT 1
          FROM public.ground_truth gt
          WHERE gt.client_id = $1::uuid
            AND (
              gt.source_trace_id = r.trace_id
              OR LOWER(regexp_replace(BTRIM(gt.user_query), '\\s+', ' ', 'g')) = r.similarity_key
            )
        )
      ORDER BY r.created_at DESC
      LIMIT $3::int
      `,
      [clientId, since, limit],
    );

    return NextResponse.json({
      data: res.rows ?? [],
      meta: {
        limit,
        lookbackDays,
        total: res.rows?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/ground-truth/bootstrap-candidates]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
