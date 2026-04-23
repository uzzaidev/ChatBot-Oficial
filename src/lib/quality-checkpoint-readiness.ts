import { query } from "@/lib/postgres";

export type QualityCheckpointStatus =
  | "ready_for_s5"
  | "not_ready"
  | "awaiting_data";

export interface QualityCheckpointCriterion {
  key:
    | "minimum_volume"
    | "pending_under_control"
    | "metadata_experiencia"
    | "metadata_periodo_ou_dia"
    | "pipeline_stability"
    | "evaluation_coverage";
  label: string;
  pass: boolean;
  blocking: boolean;
  value: number;
  threshold: number;
  detail: string;
}

export interface QualityCheckpointReadiness {
  status: QualityCheckpointStatus;
  reportDate: string | null;
  criteria: QualityCheckpointCriterion[];
  nextSteps: string[];
  summary: {
    totalTraces: number;
    pendingCount: number;
    failedCount: number;
    pendingRatioPct: number;
    failedRatioPct: number;
    experienciaRatePct: number;
    periodoRatePct: number;
    evaluationCoveragePct: number;
    criticalAlerts: number;
  };
}

interface QualityDailyCheckpointRow {
  report_date: string;
  total_traces: number;
  pending_count: number;
  failed_count: number;
  pending_buckets: Record<string, number> | null;
  metadata_capture:
    | {
        contatosNoPeriodo?: number;
        comExperiencia?: number;
        comPeriodoOuDia?: number;
      }
    | null;
  evaluation_coverage:
    | {
        evalCoveragePct?: number;
      }
    | null;
  alerts_snapshot:
    | Array<{
        severity?: "critical" | "warning";
      }>
    | null;
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPct = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
};

const buildNextSteps = (criteria: QualityCheckpointCriterion[]): string[] => {
  const failedBlocking = criteria.filter((criterion) => criterion.blocking && !criterion.pass);
  if (failedBlocking.length === 0) {
    return ["Checkpoint aprovado: iniciar Sprint 5 com os artefatos de RAG Insights."];
  }

  const byKey = new Set(failedBlocking.map((criterion) => criterion.key));
  const steps: string[] = [];

  if (byKey.has("minimum_volume")) {
    steps.push("Aguardar mais volume de conversas no tenant piloto para reduzir ruido estatistico.");
  }
  if (byKey.has("pending_under_control")) {
    steps.push("Executar reconciliacao de traces e revisar bucket de pending com maior incidencia.");
  }
  if (byKey.has("metadata_experiencia") || byKey.has("metadata_periodo_ou_dia")) {
    steps.push(
      "Refinar prompt e captura cadastral para elevar experiencia/periodo antes de liberar S5.",
    );
  }
  if (byKey.has("pipeline_stability")) {
    steps.push("Investigar alertas criticos e falhas operacionais no dashboard de qualidade.");
  }

  return steps;
};

export function evaluateQualityCheckpoint(
  row: QualityDailyCheckpointRow | null,
): QualityCheckpointReadiness {
  if (!row) {
    return {
      status: "awaiting_data",
      reportDate: null,
      criteria: [],
      nextSteps: [
        "Aguardar o primeiro snapshot diario em quality_daily_reports para avaliar o checkpoint.",
      ],
      summary: {
        totalTraces: 0,
        pendingCount: 0,
        failedCount: 0,
        pendingRatioPct: 0,
        failedRatioPct: 0,
        experienciaRatePct: 0,
        periodoRatePct: 0,
        evaluationCoveragePct: 0,
        criticalAlerts: 0,
      },
    };
  }

  const totalTraces = toNumber(row.total_traces);
  const pendingCount = toNumber(row.pending_count);
  const failedCount = toNumber(row.failed_count);
  const pendingBuckets = row.pending_buckets ?? {};
  const metadata = row.metadata_capture ?? {};
  const evaluationCoverage = row.evaluation_coverage ?? {};
  const alerts = row.alerts_snapshot ?? [];

  const pendingRatioPct = toPct(pendingCount, totalTraces);
  const failedRatioPct = toPct(failedCount, totalTraces);
  const contatosNoPeriodo = toNumber(metadata.contatosNoPeriodo);
  const comExperiencia = toNumber(metadata.comExperiencia);
  const comPeriodoOuDia = toNumber(metadata.comPeriodoOuDia);
  const experienciaRatePct = toPct(comExperiencia, contatosNoPeriodo);
  const periodoRatePct = toPct(comPeriodoOuDia, contatosNoPeriodo);
  const evaluationCoveragePct = Number(
    toNumber(evaluationCoverage.evalCoveragePct).toFixed(2),
  );
  const pendingErroIa = toNumber(pendingBuckets.erro_ia);
  const criticalAlerts = alerts.filter((alert) => alert?.severity === "critical").length;

  const criteria: QualityCheckpointCriterion[] = [
    {
      key: "minimum_volume",
      label: "Volume minimo (>= 10 traces/dia)",
      pass: totalTraces >= 10,
      blocking: true,
      value: totalTraces,
      threshold: 10,
      detail: `${totalTraces} traces no snapshot`,
    },
    {
      key: "pending_under_control",
      label: "Pending sob controle",
      pass: pendingRatioPct <= 20 && pendingErroIa === 0,
      blocking: true,
      value: pendingRatioPct,
      threshold: 20,
      detail: `pending=${pendingCount} (${pendingRatioPct}%), erro_ia=${pendingErroIa}`,
    },
    {
      key: "metadata_experiencia",
      label: "Captura de experiencia (>= 40%)",
      pass: contatosNoPeriodo > 0 && experienciaRatePct >= 40,
      blocking: true,
      value: experienciaRatePct,
      threshold: 40,
      detail: `${comExperiencia}/${contatosNoPeriodo} contatos`,
    },
    {
      key: "metadata_periodo_ou_dia",
      label: "Captura de periodo/dia (>= 40%)",
      pass: contatosNoPeriodo > 0 && periodoRatePct >= 40,
      blocking: true,
      value: periodoRatePct,
      threshold: 40,
      detail: `${comPeriodoOuDia}/${contatosNoPeriodo} contatos`,
    },
    {
      key: "pipeline_stability",
      label: "Pipeline estavel",
      pass: criticalAlerts === 0 && failedRatioPct <= 5,
      blocking: true,
      value: failedRatioPct,
      threshold: 5,
      detail: `failed=${failedCount} (${failedRatioPct}%), critical_alerts=${criticalAlerts}`,
    },
    {
      key: "evaluation_coverage",
      label: "Cobertura de avaliacoes (meta operacional >= 5%)",
      pass: evaluationCoveragePct >= 5,
      blocking: false,
      value: evaluationCoveragePct,
      threshold: 5,
      detail: `${evaluationCoveragePct}% das traces com avaliacao`,
    },
  ];

  const status: QualityCheckpointStatus = criteria.some(
    (criterion) => criterion.blocking && !criterion.pass,
  )
    ? "not_ready"
    : "ready_for_s5";

  return {
    status,
    reportDate: row.report_date,
    criteria,
    nextSteps: buildNextSteps(criteria),
    summary: {
      totalTraces,
      pendingCount,
      failedCount,
      pendingRatioPct,
      failedRatioPct,
      experienciaRatePct,
      periodoRatePct,
      evaluationCoveragePct,
      criticalAlerts,
    },
  };
}

export async function getQualityCheckpointReadiness(options: {
  clientId: string;
  reportDate?: string;
}): Promise<QualityCheckpointReadiness> {
  const reportDate = options.reportDate?.trim() || null;
  if (reportDate && !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new Error("invalid_report_date_format");
  }

  const result = await query<QualityDailyCheckpointRow>(
    `
    SELECT
      report_date::text AS report_date,
      total_traces,
      pending_count,
      failed_count,
      pending_buckets,
      metadata_capture,
      evaluation_coverage,
      alerts_snapshot
    FROM public.quality_daily_reports
    WHERE client_id = $1::uuid
      AND ($2::date IS NULL OR report_date <= $2::date)
    ORDER BY report_date DESC
    LIMIT 1
    `,
    [options.clientId, reportDate],
  );

  return evaluateQualityCheckpoint(result.rows[0] ?? null);
}
