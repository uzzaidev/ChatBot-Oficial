-- ============================================================================
-- S2 BOOTSTRAP: candidatos de Ground Truth (meta inicial: 30)
-- ============================================================================
-- Uso:
-- 1) Ajuste client_id
-- 2) Rode o SELECT para obter candidatos
-- 3) Insira via API /api/ground-truth/from-trace (preserva embedding + source_trace)
-- ============================================================================

WITH params AS (
  SELECT
    '0c17ca30-ad42-48c9-8e40-8c83e3e11da2'::uuid AS client_id,
    NOW() - INTERVAL '30 days' AS since_at
),
ranked AS (
  SELECT
    mt.id AS trace_id,
    mt.created_at,
    mt.status,
    BTRIM(mt.user_message) AS user_query,
    BTRIM(mt.agent_response) AS expected_response,
    LOWER(regexp_replace(BTRIM(mt.user_message), '\s+', ' ', 'g')) AS similarity_key,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(regexp_replace(BTRIM(mt.user_message), '\s+', ' ', 'g'))
      ORDER BY mt.created_at DESC
    ) AS rn
  FROM public.message_traces mt
  JOIN params p
    ON p.client_id = mt.client_id
  WHERE mt.created_at >= p.since_at
    AND COALESCE(NULLIF(BTRIM(mt.user_message), ''), '') <> ''
    AND COALESCE(NULLIF(BTRIM(mt.agent_response), ''), '') <> ''
    AND mt.status IN ('success', 'needs_review', 'evaluated', 'human_reviewed')
)
SELECT
  r.trace_id,
  r.created_at,
  r.status,
  LEFT(r.user_query, 180) AS user_query_180,
  LEFT(r.expected_response, 220) AS expected_response_220
FROM ranked r
WHERE r.rn = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.ground_truth gt
    JOIN params p ON p.client_id = gt.client_id
    WHERE gt.source_trace_id = r.trace_id
       OR LOWER(regexp_replace(BTRIM(gt.user_query), '\s+', ' ', 'g')) = r.similarity_key
  )
ORDER BY r.created_at DESC
LIMIT 30;

-- ----------------------------------------------------------------------------
-- Exemplo de chamada (PowerShell) para cada trace selecionado:
-- ----------------------------------------------------------------------------
-- curl.exe -X POST "https://SEU_DOMINIO/api/ground-truth/from-trace" ^
--   -H "Content-Type: application/json" ^
--   -H "Cookie: <cookie de sessao autenticada>" ^
--   -d "{\"trace_id\":\"UUID\",\"expected_response\":\"texto final revisado\",\"category\":\"atendimento\"}"
