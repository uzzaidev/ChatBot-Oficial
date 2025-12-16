-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 DEBUG PASSO A PASSO - Execute UMA query por vez
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 1: Qual é o seu client_id?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 1: Meu Client ID' as query_info,
  id,
  name,
  slug,
  created_at
FROM clients
ORDER BY created_at DESC
LIMIT 5;

-- ⚠️ COPIE O 'id' do cliente correto e use nas próximas queries!
-- Substitua 'b21b314f-c49a-467d-94b3-a21ed4412227' pelo valor do 'id' acima

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 2: O que tem na tabela bot_configurations para fast_track?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 2: Configs Fast Track' as query_info,
  config_key,
  config_value,
  pg_typeof(config_value) as value_type,
  config_value::text as value_as_text,
  created_at,
  updated_at
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- ⚠️ SUBSTITUA AQUI
  AND (
    config_key LIKE 'fast_track:%'
    OR config_key = 'flow:node_enabled:fast_track_router'
  )
ORDER BY config_key;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 3: Verificar especificamente o Nível 1
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 3: Nível 1 (Node Enabled)' as query_info,
  config_key,
  config_value,
  config_value->>'enabled' as enabled_field,
  config_value::text as raw_json,
  CASE
    WHEN config_value IS NULL THEN 'NULL'
    WHEN config_value->>'enabled' = 'true' THEN 'TRUE'
    WHEN config_value->>'enabled' = 'false' THEN 'FALSE'
    ELSE 'UNEXPECTED: ' || (config_value->>'enabled')
  END as parsed_status
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- ⚠️ SUBSTITUA AQUI
  AND config_key = 'flow:node_enabled:fast_track_router';

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 4: Verificar especificamente o Nível 2
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 4: Nível 2 (Fast Track Enabled)' as query_info,
  config_key,
  config_value,
  config_value::text as raw_value,
  pg_typeof(config_value) as value_type,
  CASE
    WHEN config_value IS NULL THEN 'NULL'
    WHEN config_value = 'true'::jsonb THEN 'TRUE (boolean jsonb)'
    WHEN config_value = '"true"'::jsonb THEN 'TRUE (string jsonb)'
    WHEN config_value = 'false'::jsonb THEN 'FALSE (boolean jsonb)'
    WHEN config_value = '"false"'::jsonb THEN 'FALSE (string jsonb)'
    ELSE 'UNEXPECTED: ' || config_value::text
  END as parsed_status
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- ⚠️ SUBSTITUA AQUI
  AND config_key = 'fast_track:enabled';

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 5: Verificar o catálogo
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 5: Catálogo de FAQs' as query_info,
  config_key,
  jsonb_array_length(config_value) as num_faqs,
  config_value as catalog_content,
  pg_typeof(config_value) as value_type
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- ⚠️ SUBSTITUA AQUI
  AND config_key = 'fast_track:catalog';

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 6: Verificar o router_model
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 6: Router Model' as query_info,
  config_key,
  config_value,
  config_value::text as model_name,
  pg_typeof(config_value) as value_type
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- ⚠️ SUBSTITUA AQUI
  AND config_key = 'fast_track:router_model';

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 7: Ver TODAS as configs (para debug)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  'Query 7: TODAS as configs' as query_info,
  config_key,
  config_value::text as value,
  created_at,
  updated_at
FROM bot_configurations
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'  -- ⚠️ SUBSTITUA AQUI
ORDER BY
  CASE
    WHEN config_key LIKE 'flow:node_enabled:%' THEN 1
    WHEN config_key LIKE 'fast_track:%' THEN 2
    ELSE 3
  END,
  config_key;
