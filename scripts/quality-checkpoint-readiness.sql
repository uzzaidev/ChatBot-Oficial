-- ============================================================================
-- CHECKPOINT 24H: readiness para iniciar S5 (tenant piloto)
-- ============================================================================
-- Uso:
-- 1) Ajuste client_id
-- 2) Rode no Supabase SQL Editor
-- 3) Leia resultado "checkpoint_status"
-- ============================================================================

WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id
),
latest AS (
  SELECT
    qdr.*,
    COALESCE((qdr.pending_buckets->>'erro_ia')::int, 0) AS pending_erro_ia,
    COALESCE((qdr.metadata_capture->>'contatosNoPeriodo')::int, 0) AS contatos_no_periodo,
    COALESCE((qdr.metadata_capture->>'comExperiencia')::int, 0) AS com_experiencia,
    COALESCE((qdr.metadata_capture->>'comPeriodoOuDia')::int, 0) AS com_periodo_ou_dia,
    COALESCE((qdr.evaluation_coverage->>'evalCoveragePct')::numeric, 0) AS eval_coverage_pct,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(COALESCE(qdr.alerts_snapshot, '[]'::jsonb)) AS alert
      WHERE alert->>'severity' = 'critical'
    )::int AS critical_alerts
  FROM public.quality_daily_reports qdr
  JOIN params p ON p.client_id = qdr.client_id
  ORDER BY qdr.report_date DESC
  LIMIT 1
),
computed AS (
  SELECT
    report_date,
    total_traces,
    pending_count,
    failed_count,
    ROUND(100.0 * pending_count / NULLIF(total_traces, 0), 2) AS pending_ratio_pct,
    ROUND(100.0 * failed_count / NULLIF(total_traces, 0), 2) AS failed_ratio_pct,
    ROUND(100.0 * com_experiencia / NULLIF(contatos_no_periodo, 0), 2) AS experiencia_rate_pct,
    ROUND(100.0 * com_periodo_ou_dia / NULLIF(contatos_no_periodo, 0), 2) AS periodo_rate_pct,
    eval_coverage_pct,
    pending_erro_ia,
    critical_alerts,
    (
      total_traces >= 10
      AND (100.0 * pending_count / NULLIF(total_traces, 0)) <= 20
      AND pending_erro_ia = 0
      AND contatos_no_periodo > 0
      AND (100.0 * com_experiencia / NULLIF(contatos_no_periodo, 0)) >= 40
      AND (100.0 * com_periodo_ou_dia / NULLIF(contatos_no_periodo, 0)) >= 40
      AND (100.0 * failed_count / NULLIF(total_traces, 0)) <= 5
      AND critical_alerts = 0
    ) AS ready_for_s5
  FROM latest
)
SELECT
  CASE
    WHEN c.report_date IS NULL THEN 'AWAITING_DATA'
    WHEN c.ready_for_s5 THEN 'READY_FOR_S5'
    ELSE 'NOT_READY'
  END AS checkpoint_status,
  c.*
FROM computed c;
