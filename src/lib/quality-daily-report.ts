import { query } from "@/lib/postgres";

type Numeric = number | null;

export interface QualityDailyReportMetrics {
  reportDate: string;
  windowStart: string;
  windowEnd: string;
  totalTraces: number;
  successCount: number;
  needsReviewCount: number;
  failedCount: number;
  pendingCount: number;
  successRatePct: number;
  semAgentResponse: number;
  avgLatencyMs: Numeric;
  p95LatencyMs: Numeric;
  pendingBuckets: Record<string, number>;
  metadataCapture: {
    contatosNoPeriodo: number;
    comEmail: number;
    comCpf: number;
    comObjetivo: number;
    comExperiencia: number;
    comPeriodoOuDia: number;
  };
  evaluationCoverage: {
    traces: number;
    evals: number;
    evalCoveragePct: number;
  };
  alertsSnapshot: Array<{
    code: string;
    severity: "critical" | "warning";
    value: number;
    threshold: number;
  }>;
}

export interface BuildQualityDailyReportOptions {
  clientId: string;
  reportDate?: string; // YYYY-MM-DD (UTC)
}

export interface RunQualityDailyReportsOptions {
  reportDate?: string;
  clientId?: string;
  limitClients?: number;
}

export interface RunQualityDailyReportsResult {
  reportDate: string;
  processedClients: number;
  stored: number;
  failed: number;
  errors: Array<{ clientId: string; error: string }>;
}

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

const resolveWindow = (reportDate?: string) => {
  if (reportDate) {
    const normalized = reportDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new Error("invalid_report_date_format");
    }
    const start = new Date(`${normalized}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      throw new Error("invalid_report_date");
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { reportDate: normalized, windowStart: start, windowEnd: end };
  }

  const now = new Date();
  const utcMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const yesterday = new Date(utcMidnight.getTime() - 24 * 60 * 60 * 1000);
  return {
    reportDate: toIsoDate(yesterday),
    windowStart: yesterday,
    windowEnd: utcMidnight,
  };
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildAlertsSnapshot = (
  metrics: Pick<
    QualityDailyReportMetrics,
    "pendingCount" | "totalTraces" | "failedCount" | "avgLatencyMs" | "metadataCapture"
  >,
) => {
  const alerts: QualityDailyReportMetrics["alertsSnapshot"] = [];
  const pendingRatio = metrics.totalTraces > 0 ? metrics.pendingCount / metrics.totalTraces : 0;
  const failedRatio = metrics.totalTraces > 0 ? metrics.failedCount / metrics.totalTraces : 0;
  const expRate =
    metrics.metadataCapture.contatosNoPeriodo > 0
      ? metrics.metadataCapture.comExperiencia / metrics.metadataCapture.contatosNoPeriodo
      : 0;
  const periodRate =
    metrics.metadataCapture.contatosNoPeriodo > 0
      ? metrics.metadataCapture.comPeriodoOuDia / metrics.metadataCapture.contatosNoPeriodo
      : 0;

  if (pendingRatio > 0.2) {
    alerts.push({
      code: "high_pending_ratio_24h",
      severity: pendingRatio > 0.35 ? "critical" : "warning",
      value: Number((pendingRatio * 100).toFixed(2)),
      threshold: 20,
    });
  }
  if (failedRatio > 0.05) {
    alerts.push({
      code: "high_failed_ratio_24h",
      severity: failedRatio > 0.12 ? "critical" : "warning",
      value: Number((failedRatio * 100).toFixed(2)),
      threshold: 5,
    });
  }
  if ((metrics.avgLatencyMs ?? 0) > 12000 && metrics.totalTraces >= 5) {
    alerts.push({
      code: "high_latency_24h",
      severity: (metrics.avgLatencyMs ?? 0) > 18000 ? "critical" : "warning",
      value: Number((metrics.avgLatencyMs ?? 0).toFixed(0)),
      threshold: 12000,
    });
  }
  if (expRate < 0.4 && metrics.metadataCapture.contatosNoPeriodo > 0) {
    alerts.push({
      code: "low_metadata_experiencia_24h",
      severity: expRate < 0.25 ? "critical" : "warning",
      value: Number((expRate * 100).toFixed(2)),
      threshold: 40,
    });
  }
  if (periodRate < 0.4 && metrics.metadataCapture.contatosNoPeriodo > 0) {
    alerts.push({
      code: "low_metadata_periodo_24h",
      severity: periodRate < 0.25 ? "critical" : "warning",
      value: Number((periodRate * 100).toFixed(2)),
      threshold: 40,
    });
  }
  return alerts;
};

export async function buildQualityDailyReport(
  options: BuildQualityDailyReportOptions,
): Promise<QualityDailyReportMetrics> {
  const { reportDate, windowStart, windowEnd } = resolveWindow(options.reportDate);

  const [summaryRes, pendingBucketsRes, metadataRes, coverageRes] = await Promise.all([
    query<{
      total_traces: number;
      success_count: number;
      needs_review_count: number;
      failed_count: number;
      pending_count: number;
      success_rate_pct: number | null;
      sem_agent_response: number;
      avg_latency_ms: number | null;
      p95_latency_ms: number | null;
    }>(
      `
      SELECT
        COUNT(*)::int AS total_traces,
        COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
        COUNT(*) FILTER (WHERE status = 'needs_review')::int AS needs_review_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
          2
        ) AS success_rate_pct,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(BTRIM(agent_response), ''), '') = ''
        )::int AS sem_agent_response,
        ROUND(AVG(latency_total_ms)::numeric, 2) AS avg_latency_ms,
        ROUND(
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_total_ms)::numeric,
          2
        ) AS p95_latency_ms
      FROM public.message_traces
      WHERE client_id = $1::uuid
        AND created_at >= $2::timestamptz
        AND created_at < $3::timestamptz
      `,
      [options.clientId, windowStart.toISOString(), windowEnd.toISOString()],
    ),
    query<{ pending_bucket: string; total: number }>(
      `
      SELECT
        COALESCE(NULLIF(metadata->>'pending_bucket', ''), 'sem_bucket') AS pending_bucket,
        COUNT(*)::int AS total
      FROM public.message_traces
      WHERE client_id = $1::uuid
        AND created_at >= $2::timestamptz
        AND created_at < $3::timestamptz
        AND status = 'pending'
      GROUP BY 1
      `,
      [options.clientId, windowStart.toISOString(), windowEnd.toISOString()],
    ),
    query<{
      contatos_no_periodo: number;
      com_email: number;
      com_cpf: number;
      com_objetivo: number;
      com_experiencia: number;
      com_periodo_ou_dia: number;
    }>(
      `
      WITH phones AS (
        SELECT DISTINCT regexp_replace(COALESCE(mt.phone, ''), '\\D', '', 'g') AS phone
        FROM public.message_traces mt
        WHERE mt.client_id = $1::uuid
          AND mt.created_at >= $2::timestamptz
          AND mt.created_at < $3::timestamptz
          AND COALESCE(mt.phone, '') <> ''
      ),
      contacts AS (
        SELECT
          regexp_replace(COALESCE(c.telefone::text, ''), '\\D', '', 'g') AS phone,
          c.metadata
        FROM public.clientes_whatsapp c
        WHERE c.client_id = $1::uuid
      )
      SELECT
        COUNT(*)::int AS contatos_no_periodo,
        COUNT(*) FILTER (
          WHERE NULLIF(c.metadata->>'email', '') IS NOT NULL
        )::int AS com_email,
        COUNT(*) FILTER (
          WHERE NULLIF(c.metadata->>'cpf', '') IS NOT NULL
        )::int AS com_cpf,
        COUNT(*) FILTER (
          WHERE NULLIF(c.metadata->>'objetivo', '') IS NOT NULL
        )::int AS com_objetivo,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(c.metadata->>'experiencia', ''), NULLIF(c.metadata->>'experiencia_yoga', '')) IS NOT NULL
        )::int AS com_experiencia,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(c.metadata->>'periodo_preferido', ''), NULLIF(c.metadata->>'dia_preferido', '')) IS NOT NULL
        )::int AS com_periodo_ou_dia
      FROM phones p
      LEFT JOIN contacts c ON c.phone = p.phone
      `,
      [options.clientId, windowStart.toISOString(), windowEnd.toISOString()],
    ),
    query<{ traces: number; evals: number; eval_coverage_pct: number | null }>(
      `
      SELECT
        COUNT(mt.id)::int AS traces,
        COUNT(DISTINCT ae.trace_id)::int AS evals,
        ROUND(
          100.0 * COUNT(DISTINCT ae.trace_id) / NULLIF(COUNT(mt.id), 0),
          2
        ) AS eval_coverage_pct
      FROM public.message_traces mt
      LEFT JOIN public.agent_evaluations ae
        ON ae.trace_id = mt.id
      WHERE mt.client_id = $1::uuid
        AND mt.created_at >= $2::timestamptz
        AND mt.created_at < $3::timestamptz
      `,
      [options.clientId, windowStart.toISOString(), windowEnd.toISOString()],
    ),
  ]);

  const summary = summaryRes.rows[0];
  const metadata = metadataRes.rows[0];
  const coverage = coverageRes.rows[0];

  const pendingBuckets = pendingBucketsRes.rows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.pending_bucket] = row.total;
      return acc;
    },
    {},
  );

  const metrics: QualityDailyReportMetrics = {
    reportDate,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    totalTraces: toNumber(summary?.total_traces),
    successCount: toNumber(summary?.success_count),
    needsReviewCount: toNumber(summary?.needs_review_count),
    failedCount: toNumber(summary?.failed_count),
    pendingCount: toNumber(summary?.pending_count),
    successRatePct: toNumber(summary?.success_rate_pct),
    semAgentResponse: toNumber(summary?.sem_agent_response),
    avgLatencyMs:
      summary?.avg_latency_ms === null || summary?.avg_latency_ms === undefined
        ? null
        : toNumber(summary.avg_latency_ms),
    p95LatencyMs:
      summary?.p95_latency_ms === null || summary?.p95_latency_ms === undefined
        ? null
        : toNumber(summary.p95_latency_ms),
    pendingBuckets,
    metadataCapture: {
      contatosNoPeriodo: toNumber(metadata?.contatos_no_periodo),
      comEmail: toNumber(metadata?.com_email),
      comCpf: toNumber(metadata?.com_cpf),
      comObjetivo: toNumber(metadata?.com_objetivo),
      comExperiencia: toNumber(metadata?.com_experiencia),
      comPeriodoOuDia: toNumber(metadata?.com_periodo_ou_dia),
    },
    evaluationCoverage: {
      traces: toNumber(coverage?.traces),
      evals: toNumber(coverage?.evals),
      evalCoveragePct: toNumber(coverage?.eval_coverage_pct),
    },
    alertsSnapshot: [],
  };

  metrics.alertsSnapshot = buildAlertsSnapshot(metrics);
  return metrics;
}

export async function storeQualityDailyReport(
  clientId: string,
  metrics: QualityDailyReportMetrics,
): Promise<void> {
  await query(
    `
    INSERT INTO public.quality_daily_reports (
      client_id,
      report_date,
      window_start,
      window_end,
      total_traces,
      success_count,
      needs_review_count,
      failed_count,
      pending_count,
      success_rate_pct,
      sem_agent_response,
      avg_latency_ms,
      p95_latency_ms,
      pending_buckets,
      metadata_capture,
      evaluation_coverage,
      alerts_snapshot
    )
    VALUES (
      $1::uuid,
      $2::date,
      $3::timestamptz,
      $4::timestamptz,
      $5::int,
      $6::int,
      $7::int,
      $8::int,
      $9::int,
      $10::numeric,
      $11::int,
      $12::numeric,
      $13::numeric,
      $14::jsonb,
      $15::jsonb,
      $16::jsonb,
      $17::jsonb
    )
    ON CONFLICT (client_id, report_date)
    DO UPDATE SET
      window_start = EXCLUDED.window_start,
      window_end = EXCLUDED.window_end,
      total_traces = EXCLUDED.total_traces,
      success_count = EXCLUDED.success_count,
      needs_review_count = EXCLUDED.needs_review_count,
      failed_count = EXCLUDED.failed_count,
      pending_count = EXCLUDED.pending_count,
      success_rate_pct = EXCLUDED.success_rate_pct,
      sem_agent_response = EXCLUDED.sem_agent_response,
      avg_latency_ms = EXCLUDED.avg_latency_ms,
      p95_latency_ms = EXCLUDED.p95_latency_ms,
      pending_buckets = EXCLUDED.pending_buckets,
      metadata_capture = EXCLUDED.metadata_capture,
      evaluation_coverage = EXCLUDED.evaluation_coverage,
      alerts_snapshot = EXCLUDED.alerts_snapshot,
      updated_at = NOW()
    `,
    [
      clientId,
      metrics.reportDate,
      metrics.windowStart,
      metrics.windowEnd,
      metrics.totalTraces,
      metrics.successCount,
      metrics.needsReviewCount,
      metrics.failedCount,
      metrics.pendingCount,
      metrics.successRatePct,
      metrics.semAgentResponse,
      metrics.avgLatencyMs,
      metrics.p95LatencyMs,
      JSON.stringify(metrics.pendingBuckets),
      JSON.stringify(metrics.metadataCapture),
      JSON.stringify(metrics.evaluationCoverage),
      JSON.stringify(metrics.alertsSnapshot),
    ],
  );
}

export async function listQualityDailyReports(options: {
  clientId: string;
  days?: number;
}) {
  const days = Math.max(1, Math.min(options.days ?? 7, 30));
  const res = await query<
    Omit<
      QualityDailyReportMetrics,
      "metadataCapture" | "evaluationCoverage" | "alertsSnapshot" | "pendingBuckets"
    > & {
      pending_buckets: Record<string, number>;
      metadata_capture: QualityDailyReportMetrics["metadataCapture"];
      evaluation_coverage: QualityDailyReportMetrics["evaluationCoverage"];
      alerts_snapshot: QualityDailyReportMetrics["alertsSnapshot"];
      created_at: string;
      updated_at: string;
    }
  >(
    `
    SELECT
      report_date::text AS "reportDate",
      window_start AS "windowStart",
      window_end AS "windowEnd",
      total_traces AS "totalTraces",
      success_count AS "successCount",
      needs_review_count AS "needsReviewCount",
      failed_count AS "failedCount",
      pending_count AS "pendingCount",
      success_rate_pct AS "successRatePct",
      sem_agent_response AS "semAgentResponse",
      avg_latency_ms AS "avgLatencyMs",
      p95_latency_ms AS "p95LatencyMs",
      pending_buckets,
      metadata_capture,
      evaluation_coverage,
      alerts_snapshot,
      created_at,
      updated_at
    FROM public.quality_daily_reports
    WHERE client_id = $1::uuid
    ORDER BY report_date DESC
    LIMIT $2::int
    `,
    [options.clientId, days],
  );

  return (res.rows ?? []).map((row) => ({
    ...row,
    pendingBuckets: row.pending_buckets ?? {},
    metadataCapture:
      row.metadata_capture ??
      ({
        contatosNoPeriodo: 0,
        comEmail: 0,
        comCpf: 0,
        comObjetivo: 0,
        comExperiencia: 0,
        comPeriodoOuDia: 0,
      } as QualityDailyReportMetrics["metadataCapture"]),
    evaluationCoverage:
      row.evaluation_coverage ?? ({ traces: 0, evals: 0, evalCoveragePct: 0 } as const),
    alertsSnapshot: row.alerts_snapshot ?? [],
  }));
}

export async function runQualityDailyReports(
  options: RunQualityDailyReportsOptions = {},
): Promise<RunQualityDailyReportsResult> {
  const window = resolveWindow(options.reportDate);
  const limitClients = Math.max(1, Math.min(options.limitClients ?? 200, 1000));
  const errors: Array<{ clientId: string; error: string }> = [];
  let clients: string[] = [];

  if (options.clientId) {
    clients = [options.clientId];
  } else {
    const clientsRes = await query<{ client_id: string }>(
      `
      SELECT DISTINCT client_id
      FROM public.message_traces
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
      ORDER BY client_id
      LIMIT $3::int
      `,
      [window.windowStart.toISOString(), window.windowEnd.toISOString(), limitClients],
    );
    clients = (clientsRes.rows ?? []).map((row) => row.client_id).filter(Boolean);
  }

  let stored = 0;
  for (const clientId of clients) {
    try {
      const metrics = await buildQualityDailyReport({
        clientId,
        reportDate: window.reportDate,
      });
      await storeQualityDailyReport(clientId, metrics);
      stored += 1;
    } catch (error) {
      errors.push({
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    reportDate: window.reportDate,
    processedClients: clients.length,
    stored,
    failed: errors.length,
    errors,
  };
}
