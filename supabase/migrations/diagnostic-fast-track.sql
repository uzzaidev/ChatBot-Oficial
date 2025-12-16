-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 DIAGNÓSTICO COMPLETO - Fast Track Router
-- ═══════════════════════════════════════════════════════════════════════
-- Execute este SQL e copie TODO o resultado

-- ───────────────────────────────────────────────────────────────────────
-- 1️⃣ VERIFICAR SEU CLIENT_ID
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🏢 MEU CLIENT_ID' as info,
  id as client_id,
  name as client_name,
  slug as client_slug
FROM clients
ORDER BY created_at DESC
LIMIT 1;

-- ───────────────────────────────────────────────────────────────────────
-- 2️⃣ VERIFICAR TODAS AS CONFIGS DO FAST TRACK (Nível 2)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📋 NÍVEL 2: Configs do Fast Track' as categoria,
  config_key,
  config_value,
  created_at,
  updated_at
FROM bot_configurations
WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
  AND config_key LIKE 'fast_track:%'
ORDER BY config_key;

-- ───────────────────────────────────────────────────────────────────────
-- 3️⃣ VERIFICAR NODE ENABLED (Nível 1) - O MAIS IMPORTANTE!
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🔘 NÍVEL 1: Node Enabled (CRÍTICO!)' as categoria,
  config_key,
  config_value,
  config_value->>'enabled' as enabled_value,
  CASE
    WHEN config_value->>'enabled' = 'true' THEN '✅ HABILITADO'
    WHEN config_value->>'enabled' = 'false' THEN '❌ DESABILITADO'
    ELSE '⚠️ VALOR INVÁLIDO: ' || config_value::text
  END as status,
  created_at,
  updated_at
FROM bot_configurations
WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
  AND config_key = 'flow:node_enabled:fast_track_router';

-- ───────────────────────────────────────────────────────────────────────
-- 4️⃣ SE NÃO ENCONTROU NADA ACIMA, VERIFICAR SE EXISTE ALGUMA CONFIG
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '❓ Existe alguma config flow:node_enabled:*?' as info,
  COUNT(*) as total_configs,
  string_agg(config_key, ', ') as config_keys_found
FROM bot_configurations
WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
  AND config_key LIKE 'flow:node_enabled:%';

-- ───────────────────────────────────────────────────────────────────────
-- 5️⃣ DIAGNÓSTICO RESUMIDO
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 RESUMO DO DIAGNÓSTICO' as titulo,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
      AND config_key = 'flow:node_enabled:fast_track_router'
      AND config_value->>'enabled' = 'true'
    ) THEN '✅'
    ELSE '❌'
  END as nivel_1_ok,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
      AND config_key = 'fast_track:enabled'
      AND config_value = 'true'::jsonb
    ) THEN '✅'
    ELSE '❌'
  END as nivel_2_ok,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
      AND config_key = 'fast_track:catalog'
      AND jsonb_array_length(config_value) > 0
    ) THEN '✅'
    ELSE '❌'
  END as catalogo_ok,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM bot_configurations
      WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
      AND config_key = 'fast_track:router_model'
    ) THEN '✅'
    ELSE '❌'
  END as model_ok;

-- ═══════════════════════════════════════════════════════════════════════
-- 🔧 SOLUÇÃO: FORÇAR ATIVAÇÃO (execute APENAS se o Nível 1 estiver ❌)
-- ═══════════════════════════════════════════════════════════════════════

-- DESCOMENTE AS LINHAS ABAIXO SE O NÍVEL 1 ESTIVER ❌

-- DELETE FROM bot_configurations
-- WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
-- AND config_key = 'flow:node_enabled:fast_track_router';

-- INSERT INTO bot_configurations (client_id, config_key, config_value, is_default, category, description)
-- VALUES (
--   (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1),
--   'flow:node_enabled:fast_track_router',
--   '{"enabled": true}'::jsonb,
--   false,
--   'rules',
--   'Node enabled state for fast_track_router'
-- );

-- ═══════════════════════════════════════════════════════════════════════
-- ✅ VERIFICAÇÃO FINAL (execute depois da solução)
-- ═══════════════════════════════════════════════════════════════════════

-- SELECT
--   '✅ VERIFICAÇÃO FINAL' as resultado,
--   config_key,
--   config_value,
--   CASE
--     WHEN config_value->>'enabled' = 'true' THEN '🟢 VERDE - ATIVO'
--     WHEN config_value->>'enabled' = 'false' THEN '🔴 VERMELHO - INATIVO'
--     ELSE '⚠️ PROBLEMA: ' || config_value::text
--   END as status_final
-- FROM bot_configurations
-- WHERE client_id = (SELECT id FROM clients ORDER BY created_at DESC LIMIT 1)
-- AND config_key = 'flow:node_enabled:fast_track_router';
