-- =====================================================
-- VERIFY AI GATEWAY TABLES
-- =====================================================
-- Execute este script no Supabase SQL Editor para verificar
-- que todas as tabelas foram criadas corretamente

-- 1. Verificar shared_gateway_config
SELECT
  'shared_gateway_config' as table_name,
  COUNT(*) as record_count,
  (SELECT COUNT(*) FROM shared_gateway_config) as has_placeholder_record
FROM shared_gateway_config;

-- 2. Verificar colunas de shared_gateway_config
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shared_gateway_config'
ORDER BY ordinal_position;

-- 3. Verificar ai_models_registry
SELECT
  'ai_models_registry' as table_name,
  COUNT(*) as total_models,
  COUNT(DISTINCT provider) as total_providers
FROM ai_models_registry;

-- 4. Listar modelos por provider
SELECT
  provider,
  COUNT(*) as model_count,
  array_agg(model_name ORDER BY model_name) as models
FROM ai_models_registry
WHERE is_active = true
GROUP BY provider
ORDER BY provider;

-- 5. Verificar gateway_usage_logs (deve estar vazia)
SELECT
  'gateway_usage_logs' as table_name,
  COUNT(*) as record_count
FROM gateway_usage_logs;

-- 6. Verificar gateway_cache_performance (deve estar vazia)
SELECT
  'gateway_cache_performance' as table_name,
  COUNT(*) as record_count
FROM gateway_cache_performance;

-- 7. Verificar client_budgets (deve estar vazia)
SELECT
  'client_budgets' as table_name,
  COUNT(*) as record_count
FROM client_budgets;

-- 8. Verificar coluna use_ai_gateway em clients
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'use_ai_gateway';

-- 9. Verificar quantos clientes têm gateway habilitado
SELECT
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE use_ai_gateway = true) as gateway_enabled_count,
  COUNT(*) FILTER (WHERE use_ai_gateway = false) as gateway_disabled_count
FROM clients;

-- 10. Verificar RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('shared_gateway_config', 'gateway_usage_logs', 'gateway_cache_performance', 'client_budgets')
ORDER BY tablename, policyname;
