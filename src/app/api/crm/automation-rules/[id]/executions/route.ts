import { maskContactInResult, maskPhone } from "@/lib/crm-automation-pii";
import { query } from "@/lib/postgres";
import { createServerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "42703";
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ruleId } = await context.params;
    if (!ruleId) {
      return NextResponse.json({ error: "Rule id is required" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const daysParam = Number.parseInt(searchParams.get("days") || "", 10);
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const days = Number.isFinite(daysParam) ? Math.max(1, Math.min(daysParam, 365)) : 30;
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 200))
      : 50;

    const values: any[] = [clientId, ruleId, days, limit];
    let statusSql = "";
    if (status) {
      values.push(status);
      statusSql = `AND e.status = $${values.length}`;
    }

    const result = await query<{
      id: string;
      status: string;
      event_type: string | null;
      event_hash: string | null;
      depth: number | null;
      skip_reason: string | null;
      error_message: string | null;
      result: Record<string, unknown> | null;
      trigger_data: Record<string, unknown> | null;
      executed_at: string;
      rule_version: number | null;
      contact_name: string | null;
      phone: string | null;
    }>(
      `SELECT
         e.id,
         e.status,
         e.event_type,
         e.event_hash,
         e.depth,
         e.skip_reason,
         e.error_message,
         e.result,
         e.trigger_data,
         e.executed_at,
         e.rule_version,
         c.contact_name,
         c.phone
       FROM crm_rule_executions e
       LEFT JOIN crm_cards c ON c.id = e.card_id
       WHERE e.client_id = $1
         AND e.rule_id = $2
         AND e.executed_at >= NOW() - make_interval(days => $3::int)
         ${statusSql}
       ORDER BY e.executed_at DESC
       LIMIT $4`,
      values,
    ).catch(async (error) => {
      if (!isMissingColumnError(error)) throw error;
      return await query<{
        id: string;
        status: string;
        event_type: string | null;
        event_hash: string | null;
        depth: number | null;
        skip_reason: string | null;
        error_message: string | null;
        result: Record<string, unknown> | null;
        trigger_data: Record<string, unknown> | null;
        executed_at: string;
        rule_version: number | null;
        contact_name: string | null;
        phone: string | null;
      }>(
        `SELECT
           e.id,
           e.status,
           e.event_type,
           e.event_hash,
           e.depth,
           e.skip_reason,
           e.error_message,
           e.result,
           e.trigger_data,
           e.executed_at,
           e.rule_version,
           NULL::text AS contact_name,
           c.phone
         FROM crm_rule_executions e
         LEFT JOIN crm_cards c ON c.id = e.card_id
         WHERE e.client_id = $1
           AND e.rule_id = $2
           AND e.executed_at >= NOW() - make_interval(days => $3::int)
           ${statusSql}
         ORDER BY e.executed_at DESC
         LIMIT $4`,
        values,
      );
    });

    const executions = result.rows.map((row) => ({
      ...row,
      phone: isAdmin ? row.phone : maskPhone(row.phone),
      result: isAdmin ? row.result : maskContactInResult(row.result),
      trigger_data: isAdmin
        ? row.trigger_data
        : maskContactInResult(row.trigger_data),
    }));

    return NextResponse.json({ executions });
  } catch (error) {
    console.error("[crm/automation-rules/:id/executions] error", error);
    return NextResponse.json(
      { error: "Failed to fetch rule executions" },
      { status: 500 },
    );
  }
}
