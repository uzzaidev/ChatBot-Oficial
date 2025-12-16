-- ═══════════════════════════════════════════════════════════════════════
-- 🔍 VERIFICAR: Cliente está usando AI Gateway?
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 1: Status do AI Gateway para o cliente
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🔍 AI Gateway Status:' as info,
  id,
  name,
  slug,
  use_ai_gateway,
  CASE
    WHEN use_ai_gateway = true THEN '✅ HABILITADO'
    WHEN use_ai_gateway = false THEN '❌ DESABILITADO'
    WHEN use_ai_gateway IS NULL THEN '⚠️ NULL (default: false)'
    ELSE '❓ VALOR INESPERADO'
  END as status,
  created_at
FROM clients
WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 2: Ver configuração global do AI Gateway
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '🌐 Global AI Gateway Config:' as info,
  gateway_api_key IS NOT NULL as has_gateway_key,
  openai_api_key IS NOT NULL as has_openai_key,
  groq_api_key IS NOT NULL as has_groq_key,
  anthropic_api_key IS NOT NULL as has_anthropic_key,
  enabled,
  created_at
FROM shared_gateway_config
LIMIT 1;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 3: Ver se há logs de uso do gateway (últimas 24h)
-- ───────────────────────────────────────────────────────────────────────
SELECT
  '📊 Gateway Usage (24h):' as info,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as cache_misses,
  ROUND(
    (SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100),
    2
  ) as cache_hit_rate_pct
FROM gateway_usage_logs
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  AND created_at > NOW() - INTERVAL '24 hours';

-- ═══════════════════════════════════════════════════════════════════════
-- 💡 SOLUÇÃO: Habilitar AI Gateway para o cliente
-- ═══════════════════════════════════════════════════════════════════════

-- ⚠️ Descomente e execute SOMENTE se o cliente não tiver AI Gateway habilitado:

-- UPDATE clients
-- SET use_ai_gateway = true
-- WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';

-- -- Verificar
-- SELECT
--   id,
--   name,
--   use_ai_gateway,
--   CASE
--     WHEN use_ai_gateway = true THEN '✅ HABILITADO'
--     ELSE '❌ DESABILITADO'
--   END as status
-- FROM clients
-- WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';
