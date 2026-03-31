import { query } from "@/lib/postgres";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isAuthorizedCronRequest = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
};

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const successCleanup = await query<{ count: number }>(
      `
        WITH deleted AS (
          DELETE FROM crm_rule_executions
          WHERE executed_at < NOW() - INTERVAL '90 days'
            AND status IN ('success', 'skipped')
          RETURNING 1
        )
        SELECT COUNT(*)::int AS count FROM deleted
      `,
    );

    const errorCleanup = await query<{ count: number }>(
      `
        WITH deleted AS (
          DELETE FROM crm_rule_executions
          WHERE executed_at < NOW() - INTERVAL '180 days'
            AND status IN ('failed', 'error')
          RETURNING 1
        )
        SELECT COUNT(*)::int AS count FROM deleted
      `,
    );

    return NextResponse.json({
      success: true,
      deleted_success_or_skipped: successCleanup.rows[0]?.count ?? 0,
      deleted_errors: errorCleanup.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("[cron/crm-executions-cleanup] error", error);
    return NextResponse.json(
      { error: "Failed to cleanup CRM execution logs" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
