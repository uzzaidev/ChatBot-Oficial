-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 DEBUG: Identificar qual client_id está sendo usado no webhook
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 1: Qual cliente está associado ao telefone 555499250023?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🔍 Cliente do telefone testado:' as info,
  cw.client_id,
  c.name as client_name,
  c.slug as client_slug,
  cw.telefone,
  cw.nome as customer_name,
  cw.status as customer_status
FROM clientes_whatsapp cw
JOIN clients c ON cw.client_id = c.id
WHERE cw.telefone = 555499250023;

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 2: Esse cliente TEM configs do Fast Track?
-- ───────────────────────────────────────────────────────────────────────
WITH cliente_do_teste AS (
  SELECT client_id
  FROM clientes_whatsapp
  WHERE telefone = 555499250023
  LIMIT 1
)
SELECT
  '📋 Configs Fast Track para o cliente do teste:' as info,
  config_key,
  config_value::text as value,
  created_at
FROM bot_configurations
WHERE client_id = (SELECT client_id FROM cliente_do_teste)
  AND (
    config_key LIKE 'fast_track:%'
    OR config_key = 'flow:node_enabled:fast_track_router'
  )
ORDER BY
  CASE
    WHEN config_key = 'flow:node_enabled:fast_track_router' THEN 1
    WHEN config_key = 'fast_track:enabled' THEN 2
    ELSE 3
  END,
  config_key;

-- ───────────────────────────────────────────────────────────────────────
-- PASSO 3: Se não tem, vamos listar TODOS os clientes com suas configs
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 TODOS os clientes e suas configs Fast Track:' as info,
  c.id as client_id,
  c.name as client_name,
  c.slug as client_slug,
  COUNT(DISTINCT bc.config_key) FILTER (
    WHERE bc.config_key LIKE 'fast_track:%'
       OR bc.config_key = 'flow:node_enabled:fast_track_router'
  ) as num_fast_track_configs,
  STRING_AGG(
    DISTINCT bc.config_key,
    ', '
    ORDER BY bc.config_key
  ) FILTER (
    WHERE bc.config_key LIKE 'fast_track:%'
       OR bc.config_key = 'flow:node_enabled:fast_track_router'
  ) as config_keys
FROM clients c
LEFT JOIN bot_configurations bc ON c.id = bc.client_id
GROUP BY c.id, c.name, c.slug
ORDER BY num_fast_track_configs DESC NULLS LAST, c.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- 💡 SOLUÇÃO: Se o cliente do teste NÃO tem configs, copiar de outro
-- ═══════════════════════════════════════════════════════════════════════

-- ⚠️ NÃO EXECUTE AINDA! Primeiro veja os resultados acima.
-- Se necessário, descomente e SUBSTITUA os client_ids:

-- INSERT INTO bot_configurations (
--   client_id,
--   config_key,
--   config_value,
--   is_default,
--   category,
--   description
-- )
-- SELECT
--   'CLIENTE_CORRETO_AQUI'::uuid as client_id,  -- ⚠️ SUBSTITUA
--   config_key,
--   config_value,
--   false as is_default,
--   category,
--   description
-- FROM bot_configurations
-- WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- Cliente com configs
--   AND (
--     config_key LIKE 'fast_track:%'
--     OR config_key = 'flow:node_enabled:fast_track_router'
--   );
