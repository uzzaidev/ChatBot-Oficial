-- ============================================================================
-- S4 OPERACIONAL: fila priorizada de revisao de FAIL/REVIEW
-- ============================================================================
-- Uso:
-- 1) Ajuste client_id
-- 2) Rode no Supabase SQL Editor
-- 3) Use o trace_id para abrir/revisar no dashboard de quality
-- ============================================================================

WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '14 days' AS since_at
),
reviewable AS (
  SELECT
    ae.id AS evaluation_id,
    ae.trace_id,
    ae.created_at AS evaluation_created_at,
    ae.verdict,
    ae.score_relevance,
    ae.score_factuality,
    ae.score_safety,
    ae.score_clarity,
    mt.user_message,
    mt.agent_response,
    mt.status AS trace_status
  FROM public.agent_evaluations ae
  JOIN public.message_traces mt
    ON mt.id = ae.trace_id
  JOIN params p
    ON p.client_id = ae.client_id
  WHERE ae.created_at >= p.since_at
    AND ae.verdict IN ('FAIL', 'REVIEW')
),
without_human_feedback AS (
  SELECT r.*
  FROM reviewable r
  LEFT JOIN public.human_feedback hf
    ON hf.trace_id = r.trace_id
  WHERE hf.id IS NULL
)
SELECT
  evaluation_id,
  trace_id,
  evaluation_created_at,
  verdict,
  trace_status,
  ROUND(
    COALESCE(score_relevance, 0) +
    COALESCE(score_factuality, 0) +
    COALESCE(score_safety, 0) +
    COALESCE(score_clarity, 0),
    2
  ) AS score_sum_0_to_4,
  LEFT(COALESCE(user_message, ''), 180) AS user_msg_180,
  LEFT(COALESCE(agent_response, ''), 220) AS bot_msg_220
FROM without_human_feedback
ORDER BY evaluation_created_at DESC
LIMIT 100;
