import { clearCrmAutomationRuleCache } from "@/lib/crm-automation-engine";
import { getClient, query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ReorderItem {
  id: string;
  priority: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rules = Array.isArray(body.rules) ? (body.rules as ReorderItem[]) : [];

    if (rules.length === 0) {
      return NextResponse.json(
        { error: "rules must be a non-empty array" },
        { status: 400 },
      );
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      for (const item of rules) {
        if (!item?.id || !Number.isFinite(item.priority)) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Each rule requires id and numeric priority" },
            { status: 400 },
          );
        }

        await client.query(
          `UPDATE crm_automation_rules
           SET priority = $1,
               updated_at = NOW()
           WHERE id = $2
             AND client_id = $3
             AND is_system = false`,
          [item.priority, item.id, clientId],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    clearCrmAutomationRuleCache(clientId);

    const updated = await query(
      `SELECT id, priority
       FROM crm_automation_rules
       WHERE client_id = $1
       ORDER BY priority DESC, created_at ASC`,
      [clientId],
    );

    return NextResponse.json({ rules: updated.rows });
  } catch (error) {
    console.error("[crm/automation-rules/reorder] error", error);
    return NextResponse.json(
      { error: "Failed to reorder automation rules" },
      { status: 500 },
    );
  }
}
