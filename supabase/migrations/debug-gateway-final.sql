-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 DEBUG FINAL: Verificar se há logs na tabela custom
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 1: Ver registros recentes (últimas 24h)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 Gateway Logs (24h):' as info,
  created_at,
  client_id,
  provider,
  model_name,  -- ✅ CORRIGIDO
  total_tokens,
  cost_brl,
  was_cached,  -- ✅ CORRIGIDO
  request_id
FROM gateway_usage_logs
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 2: Resumo por provider (24h)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 Resumo por Provider (24h):' as info,
  provider,
  model_name,  -- ✅ CORRIGIDO
  COUNT(*) as total_requests,
  SUM(CASE WHEN was_cached THEN 1 ELSE 0 END) as cache_hits,  -- ✅ CORRIGIDO
  SUM(CASE WHEN NOT COALESCE(was_cached, false) THEN 1 ELSE 0 END) as cache_misses,  -- ✅ CORRIGIDO
  SUM(total_tokens) as total_tokens,
  ROUND(SUM(cost_brl), 4) as total_cost_brl
FROM gateway_usage_logs
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, model_name  -- ✅ CORRIGIDO
ORDER BY total_requests DESC;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 3: Total geral (todas as horas)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 Total Geral:' as info,
  COUNT(*) as total_all_time,
  SUM(CASE WHEN was_cached THEN 1 ELSE 0 END) as cache_hits_all_time,
  SUM(total_tokens) as total_tokens_all_time,
  ROUND(SUM(cost_brl), 2) as total_cost_brl_all_time,
  MIN(created_at) as primeiro_registro,
  MAX(created_at) as ultimo_registro
FROM gateway_usage_logs
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227';

-- ═══════════════════════════════════════════════════════════════════════
-- 💡 DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════
-- Se QUERY 1 retornar REGISTROS:
--   → Você está usando APIs DIRETAS (OpenAI, Groq, etc)
--   → Salvando logs na SUA tabela custom (gateway_usage_logs)
--   → Por isso NÃO aparece no dashboard da Vercel
--   → O dashboard da Vercel só mostra requests que passam pelo AI SDK
--
-- Se QUERY 1 retornar VAZIO:
--   → Nenhuma request está sendo logada
--   → Ou o código não está funcionando
--   → Ou há erro no logGatewayUsage()
--
-- Para aparecer no dashboard da Vercel, você precisa:
--   1. Migrar para usar @ai-sdk/openai, @ai-sdk/anthropic
--   2. Fazer requests através do AI SDK
--   3. O tráfego passa por https://api.vercel.com/v1/ai/...
--   4. Aí sim aparece no dashboard
-- ═══════════════════════════════════════════════════════════════════════
