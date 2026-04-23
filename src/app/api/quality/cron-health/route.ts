import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CronHealthStatus = "ok" | "warning" | "critical";

interface CronHealthItem {
  key: "traces_reconcile" | "quality_daily_report";
  status: CronHealthStatus;
  detail: string;
  lastRunAt: string | null;
}

const statusWeight: Record<CronHealthStatus, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

const maxStatus = (items: CronHealthItem[]): CronHealthStatus => {
  const max = items.reduce((acc, item) => Math.max(acc, statusWeight[item.status]), 0);
  return (Object.entries(statusWeight).find(([, v]) => v === max)?.[0] ?? "ok") as CronHealthStatus;
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twoHoursAgoIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const [reconcileRes, dailyReportRes, recentLoadRes] = await Promise.all([
      query<{ last_reconcile_at: string | null }>(
        `
        SELECT
          MAX((metadata->'reconciliation'->>'reconciled_at')::timestamptz)::text AS last_reconcile_at
        FROM public.message_traces
        WHERE client_id = $1::uuid
          AND metadata ? 'reconciliation'
        `,
        [clientId],
      ),
      query<{ last_report_date: string | null }>(
        `
        SELECT MAX(report_date)::text AS last_report_date
        FROM public.quality_daily_reports
        WHERE client_id = $1::uuid
        `,
        [clientId],
      ),
      query<{ recent_traces: number; recent_pending: number }>(
        `
        SELECT
          COUNT(*)::int AS recent_traces,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS recent_pending
        FROM public.message_traces
        WHERE client_id = $1::uuid
          AND created_at >= $2::timestamptz
        `,
        [clientId, twoHoursAgoIso],
      ),
    ]);

    const lastReconcileAt = reconcileRes.rows[0]?.last_reconcile_at ?? null;
    const lastReportDate = dailyReportRes.rows[0]?.last_report_date ?? null;
    const recentTraces = Number(recentLoadRes.rows[0]?.recent_traces ?? 0);
    const recentPending = Number(recentLoadRes.rows[0]?.recent_pending ?? 0);

    const cronItems: CronHealthItem[] = [];

    if (!lastReconcileAt) {
      cronItems.push({
        key: "traces_reconcile",
        status: recentPending > 0 ? "critical" : "warning",
        detail:
          recentPending > 0
            ? "Nao ha reconciliacao registrada e existem traces pendentes recentes."
            : "Ainda sem reconciliacao registrada (sem pending recente).",
        lastRunAt: null,
      });
    } else {
      const diffMinutes = Math.round(
        (now.getTime() - new Date(lastReconcileAt).getTime()) / 60000,
      );
      const reconcileStatus: CronHealthStatus =
        diffMinutes <= 20 ? "ok" : recentPending > 0 ? "critical" : "warning";

      cronItems.push({
        key: "traces_reconcile",
        status: reconcileStatus,
        detail:
          reconcileStatus === "ok"
            ? `Reconciliacao recente (${diffMinutes} min).`
            : reconcileStatus === "critical"
              ? `Reconciliacao atrasada (${diffMinutes} min) com pending recente.`
              : `Reconciliacao atrasada (${diffMinutes} min), sem risco imediato.`,
        lastRunAt: lastReconcileAt,
      });
    }

    if (!lastReportDate) {
      cronItems.push({
        key: "quality_daily_report",
        status: "warning",
        detail: "Ainda nao existe snapshot em quality_daily_reports para este tenant.",
        lastRunAt: null,
      });
    } else {
      const todayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const reportUtc = new Date(`${lastReportDate}T00:00:00.000Z`);
      const lagDays = Math.round((todayUtc.getTime() - reportUtc.getTime()) / 86400000);
      const reportStatus: CronHealthStatus = lagDays <= 1 ? "ok" : lagDays <= 2 ? "warning" : "critical";

      cronItems.push({
        key: "quality_daily_report",
        status: reportStatus,
        detail:
          reportStatus === "ok"
            ? `Snapshot diario atualizado (${lastReportDate}).`
            : reportStatus === "warning"
              ? `Snapshot com atraso leve (${lagDays} dias).`
              : `Snapshot com atraso critico (${lagDays} dias).`,
        lastRunAt: `${lastReportDate}T00:00:00.000Z`,
      });
    }

    return NextResponse.json({
      data: {
        status: maxStatus(cronItems),
        crons: cronItems,
        recentLoad: {
          last2hTraces: recentTraces,
          last2hPending: recentPending,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/quality/cron-health]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
