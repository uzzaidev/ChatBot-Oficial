-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 DEBUG: Simular exatamente o que getBotConfigs() retorna
-- ═══════════════════════════════════════════════════════════════════════

-- Este SQL simula EXATAMENTE a query do getBotConfigs() em src/lib/config.ts:391-395

-- ───────────────────────────────────────────────────────────────────────
-- STEP 1: Ver o que a query retorna (RAW)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📦 RAW QUERY RESULT (como getBotConfigs recebe)' as info,
  config_key,
  config_value,
  config_value::text as config_value_text,
  is_default,
  client_id,
  CASE
    WHEN client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227' THEN '🎯 MEU CLIENTE'
    WHEN is_default = true THEN '📋 DEFAULT'
    ELSE '❓ OUTRO CLIENTE'
  END as source_type
FROM bot_configurations
WHERE config_key IN (
  'fast_track:enabled',
  'fast_track:router_model',
  'fast_track:similarity_threshold',
  'fast_track:catalog',
  'fast_track:keywords',
  'fast_track:match_mode',
  'fast_track:disable_tools'
)
AND (
  client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  OR is_default = true
)
ORDER BY
  config_key,
  CASE WHEN is_default THEN 1 ELSE 0 END; -- Defaults primeiro

-- ───────────────────────────────────────────────────────────────────────
-- STEP 2: Simular a lógica do getBotConfigs() - Priorizar cliente sobre default
-- ───────────────────────────────────────────────────────────────────────
WITH raw_data AS (
  SELECT
    config_key,
    config_value,
    is_default,
    client_id
  FROM bot_configurations
  WHERE config_key IN (
    'fast_track:enabled',
    'fast_track:router_model',
    'fast_track:similarity_threshold',
    'fast_track:catalog',
    'fast_track:keywords',
    'fast_track:match_mode',
    'fast_track:disable_tools'
  )
  AND (
    client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
    OR is_default = true
  )
),
-- Primeiro pegar defaults
defaults AS (
  SELECT DISTINCT ON (config_key)
    config_key,
    config_value,
    'DEFAULT' as source
  FROM raw_data
  WHERE is_default = true
),
-- Depois pegar configs do cliente (sobrescreve defaults)
client_configs AS (
  SELECT DISTINCT ON (config_key)
    config_key,
    config_value,
    'CLIENT' as source
  FROM raw_data
  WHERE is_default = false
),
-- Merge: client configs sobrescrevem defaults
final_configs AS (
  SELECT
    COALESCE(c.config_key, d.config_key) as config_key,
    COALESCE(c.config_value, d.config_value) as config_value,
    COALESCE(c.source, d.source) as source
  FROM defaults d
  FULL OUTER JOIN client_configs c ON d.config_key = c.config_key
)
SELECT
  '🎯 FINAL CONFIG MAP (o que fastTrackRouter recebe)' as info,
  config_key,
  config_value,
  config_value::text as config_value_text,
  source,
  CASE
    WHEN config_key = 'fast_track:enabled' AND config_value = 'true'::jsonb THEN '✅ ENABLED (boolean true)'
    WHEN config_key = 'fast_track:enabled' AND config_value = '"true"'::jsonb THEN '✅ ENABLED (string "true")'
    WHEN config_key = 'fast_track:enabled' AND config_value = 'false'::jsonb THEN '❌ DISABLED (boolean false)'
    WHEN config_key = 'fast_track:enabled' THEN '⚠️ UNEXPECTED VALUE: ' || config_value::text
    ELSE '📋 OK'
  END as status
FROM final_configs
ORDER BY config_key;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 3: Verificar se existe algum DEFAULT com is_default=true
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '❓ EXISTEM DEFAULTS?' as info,
  config_key,
  config_value::text,
  is_default,
  client_id
FROM bot_configurations
WHERE config_key LIKE 'fast_track:%'
  AND is_default = true;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 4: Verificar se o client_id está correto
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🔍 CLIENT_ID CORRETO?' as info,
  'b21b314f-c49a-467d-94b3-a21ed4412227' as expected_client_id,
  id as actual_client_id,
  name,
  slug,
  CASE
    WHEN id = 'b21b314f-c49a-467d-94b3-a21ed4412227' THEN '✅ MATCH'
    ELSE '❌ DIFFERENT!'
  END as match_status
FROM clients
ORDER BY created_at DESC
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════
-- 📊 RESUMO DO DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════
SELECT
  '📊 RESUMO' as resultado,
  (
    SELECT COUNT(*)
    FROM bot_configurations
    WHERE config_key = 'fast_track:enabled'
      AND client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
      AND config_value = 'true'::jsonb
  ) as tem_enabled_true,
  (
    SELECT COUNT(*)
    FROM bot_configurations
    WHERE config_key = 'fast_track:enabled'
      AND is_default = true
  ) as tem_default_enabled,
  (
    SELECT config_value::text
    FROM bot_configurations
    WHERE config_key = 'fast_track:enabled'
      AND client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
    LIMIT 1
  ) as valor_atual;
