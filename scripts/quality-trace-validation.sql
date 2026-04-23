-- ============================================================================
-- QUALITY / TRACES VALIDATION BY TENANT (SUPABASE SQL EDITOR)
-- ============================================================================
-- Como usar:
-- 1) Substitua o UUID em params.client_id
-- 2) Ajuste a janela "since_at" (default: ultimas 48h)
-- 3) Rode os blocos separadamente no SQL Editor
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) RESUMO DE TRACE HEALTH
-- ---------------------------------------------------------------------------
WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '48 hours' AS since_at
)
SELECT
  COUNT(*)::int AS total_traces,
  COUNT(*) FILTER (WHERE mt.status = 'success')::int AS success_count,
  COUNT(*) FILTER (WHERE mt.status = 'needs_review')::int AS needs_review_count,
  COUNT(*) FILTER (WHERE mt.status = 'failed')::int AS failed_count,
  COUNT(*) FILTER (WHERE mt.status = 'pending')::int AS pending_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mt.status = 'success') / NULLIF(COUNT(*), 0),
    2
  ) AS success_rate_pct,
  COUNT(*) FILTER (
    WHERE COALESCE(NULLIF(TRIM(mt.agent_response), ''), '') = ''
  )::int AS sem_agent_response,
  ROUND(AVG(mt.latency_total_ms)::numeric, 2) AS avg_latency_ms,
  ROUND(
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mt.latency_total_ms)::numeric,
    2
  ) AS p95_latency_ms
FROM public.message_traces mt
JOIN params p ON p.client_id = mt.client_id
WHERE mt.created_at >= p.since_at;

-- ---------------------------------------------------------------------------
-- 2) BUCKET DE PENDING (METADATA)
-- ---------------------------------------------------------------------------
WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '48 hours' AS since_at
)
SELECT
  COALESCE(NULLIF(mt.metadata->>'pending_bucket', ''), 'sem_bucket') AS pending_bucket,
  COUNT(*)::int AS total
FROM public.message_traces mt
JOIN params p ON p.client_id = mt.client_id
WHERE mt.created_at >= p.since_at
  AND mt.status = 'pending'
GROUP BY 1
ORDER BY total DESC;

-- ---------------------------------------------------------------------------
-- 3) RECONCILIACAO TRACE X CHAT_HISTORY (por wamid e fallback por telefone)
-- ---------------------------------------------------------------------------
WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '48 hours' AS since_at
),
trace_base AS (
  SELECT
    mt.id AS trace_id,
    mt.created_at,
    regexp_replace(COALESCE(mt.phone, ''), '\D', '', 'g') AS phone_digits,
    mt.whatsapp_message_id,
    mt.status,
    mt.agent_response,
    mt.user_message
  FROM public.message_traces mt
  JOIN params p ON p.client_id = mt.client_id
  WHERE mt.created_at >= p.since_at
),
hist AS (
  SELECT
    nh.id,
    nh.created_at,
    regexp_replace(COALESCE(nh.session_id, ''), '\D', '', 'g') AS phone_digits,
    nh.wamid,
    nh.status,
    nh.message
  FROM public.n8n_chat_histories nh
  JOIN params p ON p.client_id = nh.client_id
  WHERE nh.created_at >= p.since_at - INTERVAL '2 hours'
),
recon AS (
  SELECT
    tb.*,
    hw.id AS hist_wamid_id,
    hw.status AS hist_wamid_status,
    hp.id AS hist_phone_id,
    hp.status AS hist_phone_status
  FROM trace_base tb
  LEFT JOIN hist hw
    ON tb.whatsapp_message_id IS NOT NULL
   AND hw.wamid = tb.whatsapp_message_id
  LEFT JOIN LATERAL (
    SELECT h2.id, h2.status
    FROM hist h2
    WHERE h2.phone_digits = tb.phone_digits
      AND h2.created_at BETWEEN tb.created_at - INTERVAL '5 minutes'
                            AND tb.created_at + INTERVAL '25 minutes'
      AND COALESCE(h2.message->>'type', '') = 'ai'
    ORDER BY ABS(EXTRACT(EPOCH FROM (h2.created_at - tb.created_at))) ASC
    LIMIT 1
  ) hp ON TRUE
)
SELECT
  created_at,
  trace_id,
  phone_digits AS phone,
  CASE
    WHEN hist_wamid_id IS NOT NULL OR hist_phone_id IS NOT NULL THEN 'tem_ai_no_chat_history'
    ELSE 'sem_ai_no_chat_history'
  END AS reconciliation,
  COALESCE(hist_wamid_status, hist_phone_status) AS ai_status,
  LEFT(COALESCE(agent_response, ''), 160) AS ai_content_160,
  LEFT(COALESCE(user_message, ''), 120) AS user_msg_120
FROM recon
ORDER BY created_at DESC
LIMIT 120;

-- ---------------------------------------------------------------------------
-- 4) COBERTURA DE CAPTURA CADASTRAL (CAST-SAFE PARA TELEFONE)
-- ---------------------------------------------------------------------------
WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '48 hours' AS since_at
),
phones AS (
  SELECT DISTINCT regexp_replace(COALESCE(mt.phone, ''), '\D', '', 'g') AS phone
  FROM public.message_traces mt
  JOIN params p ON p.client_id = mt.client_id
  WHERE mt.created_at >= p.since_at
    AND COALESCE(mt.phone, '') <> ''
),
contacts AS (
  SELECT
    regexp_replace(COALESCE(c.telefone::text, ''), '\D', '', 'g') AS phone,
    c.metadata
  FROM public.clientes_whatsapp c
  JOIN params p ON p.client_id = c.client_id
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
LEFT JOIN contacts c ON c.phone = p.phone;

-- ---------------------------------------------------------------------------
-- 5) COBERTURA DE AVALIACOES (S3/S4)
-- ---------------------------------------------------------------------------
WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '7 days' AS since_at
)
SELECT
  DATE_TRUNC('day', mt.created_at)::date AS dia,
  COUNT(mt.id)::int AS traces,
  COUNT(ae.id)::int AS evals,
  ROUND(100.0 * COUNT(ae.id) / NULLIF(COUNT(mt.id), 0), 2) AS eval_coverage_pct
FROM public.message_traces mt
JOIN params p ON p.client_id = mt.client_id
LEFT JOIN public.agent_evaluations ae
  ON ae.trace_id = mt.id
WHERE mt.created_at >= p.since_at
GROUP BY 1
ORDER BY 1 DESC;
