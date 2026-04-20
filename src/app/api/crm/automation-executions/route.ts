import { maskContactInResult, maskPhone } from "@/lib/crm-automation-pii";
import { query } from "@/lib/postgres";
import { createServerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "42703";
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const triggerType = searchParams.get("triggerType");
    const ruleId = searchParams.get("ruleId");
    const daysParam = Number.parseInt(searchParams.get("days") || "", 10);
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const days = Number.isFinite(daysParam) ? Math.max(1, Math.min(daysParam, 365)) : 7;
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 500))
      : 120;

    const values: unknown[] = [clientId, days, limit];
    const predicates: string[] = [
      "e.client_id = $1",
      "e.executed_at >= NOW() - make_interval(days => $2::int)",
    ];

    if (status && status !== "all") {
      values.push(status);
      predicates.push(`e.status = $${values.length}`);
    }

    if (triggerType && triggerType !== "all") {
      values.push(triggerType);
      predicates.push(`e.event_type = $${values.length}`);
    }

    if (ruleId && ruleId !== "all") {
      values.push(ruleId);
      predicates.push(`e.rule_id = $${values.length}`);
    }

    let result = await query<{
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
      rule_id: string | null;
      rule_name: string | null;
      trigger_conditions: Record<string, unknown> | null;
      contact_name: string | null;
      phone: string | null;
      card_id: string;
      rule_version: number | null;
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
         e.rule_id,
         r.name AS rule_name,
         r.trigger_conditions,
         c.contact_name,
         c.phone,
         e.card_id,
         e.rule_version
       FROM crm_rule_executions e
       LEFT JOIN crm_automation_rules r ON r.id = e.rule_id
       LEFT JOIN crm_cards c ON c.id = e.card_id
       WHERE ${predicates.join(" AND ")}
       ORDER BY e.executed_at DESC
       LIMIT $3`,
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
        rule_id: string | null;
        rule_name: string | null;
        trigger_conditions: Record<string, unknown> | null;
        contact_name: string | null;
        phone: string | null;
        card_id: string;
        rule_version: number | null;
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
           e.rule_id,
           r.name AS rule_name,
           r.trigger_conditions,
           NULL::text AS contact_name,
           c.phone,
           e.card_id,
           e.rule_version
         FROM crm_rule_executions e
         LEFT JOIN crm_automation_rules r ON r.id = e.rule_id
         LEFT JOIN crm_cards c ON c.id = e.card_id
         WHERE ${predicates.join(" AND ")}
         ORDER BY e.executed_at DESC
         LIMIT $3`,
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
    console.error("[crm/automation-executions] error", error);
    return NextResponse.json(
      { error: "Failed to fetch automation executions" },
      { status: 500 },
    );
  }
}
