-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 VERIFICAR: Existe ALGUMA config Fast Track no banco?
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 1: Existe ALGUMA config fast_track:* (qualquer client)?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🔍 Todas as configs fast_track no banco:' as info,
  client_id,
  config_key,
  config_value::text as value,
  is_default,
  created_at
FROM bot_configurations
WHERE config_key LIKE 'fast_track:%'
   OR config_key = 'flow:node_enabled:fast_track_router'
ORDER BY created_at DESC;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 2: Quantas configs existem no total?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 Resumo:' as info,
  COUNT(*) FILTER (WHERE config_key LIKE 'fast_track:%') as num_fast_track_configs,
  COUNT(*) FILTER (WHERE config_key = 'flow:node_enabled:fast_track_router') as num_node_enabled_configs,
  COUNT(*) as total_configs
FROM bot_configurations;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 3: Qual client_id deveria ter as configs?
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🎯 Cliente esperado:' as info,
  'b21b314f-c49a-467d-94b3-a21ed4412227'::uuid as expected_client_id,
  EXISTS(
    SELECT 1 FROM clients WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  ) as client_exists,
  (SELECT name FROM clients WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227') as client_name;

-- ═══════════════════════════════════════════════════════════════════════
-- 💡 DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════
-- Se QUERY 1 retornar VAZIO:
--   → As configs NUNCA foram salvas no banco
--   → O problema está no front-end (FastTrackRouterProperties.tsx)
--   → Precisamos investigar por que o salvamento não funciona
--
-- Se QUERY 1 retornar configs para OUTRO client_id:
--   → As configs foram salvas, mas para o cliente errado
--   → Precisamos corrigir o client_id
--
-- Se QUERY 1 retornar configs para o client_id correto:
--   → Há algum problema na query do getBotConfigs()
--   → Mas isso é improvável dado que intent_classifier funciona
-- ═══════════════════════════════════════════════════════════════════════
