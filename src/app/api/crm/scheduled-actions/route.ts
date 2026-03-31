import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const cardId = searchParams.get("card_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 200))
      : 100;

    const whereParts = ["client_id = $1"];
    const values: any[] = [clientId];

    if (status) {
      values.push(status);
      whereParts.push(`status = $${values.length}`);
    }
    if (cardId) {
      values.push(cardId);
      whereParts.push(`card_id = $${values.length}`);
    }
    if (from) {
      values.push(from);
      whereParts.push(`execute_at >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      whereParts.push(`execute_at <= $${values.length}`);
    }

    values.push(limit);

    const result = await query(
      `SELECT
         id, client_id, rule_id, card_id, action_type, action_params,
         execute_at, executed_at, status, error_message, trace_id, depth,
         created_at, updated_at
       FROM crm_scheduled_actions
       WHERE ${whereParts.join(" AND ")}
       ORDER BY execute_at ASC
       LIMIT $${values.length}`,
      values,
    );

    return NextResponse.json({ actions: result.rows });
  } catch (error) {
    console.error("[crm/scheduled-actions] GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled actions" },
      { status: 500 },
    );
  }
}
