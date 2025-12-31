-- ===================================================================
-- Migration: Fix AI Gateway Errors
-- ===================================================================
-- Purpose: Fix errors in AI Gateway usage tracking
-- Date: 2025-12-31
--
-- PROBLEMAS:
-- 1. Model not found: text-embedding-3-small (embeddings não estão no registry)
-- 2. NULL value in column "phone" (embeddings não têm phone associado)
--
-- SOLUÇÕES:
-- 1. Adicionar modelos de embedding da OpenAI ao registry
-- 2. Tornar coluna phone NULLABLE em gateway_usage_logs
-- ===================================================================

-- ===================================================================
-- PARTE 1: Adicionar Modelos de Embedding ao Registry
-- ===================================================================

INSERT INTO ai_models_registry (
  provider,
  model_name,
  gateway_identifier,
  capabilities,
  context_window,
  max_output_tokens,
  input_price_per_million,
  output_price_per_million,
  is_active,
  description
) VALUES
-- text-embedding-3-small (Most cost-effective)
(
  'openai',
  'text-embedding-3-small',
  'openai/text-embedding-3-small',
  '{"text": true, "embedding": true}'::jsonb,
  8191,
  NULL,  -- Embeddings não têm output tokens
  0.020,  -- $0.02 por 1M tokens
  0.0,    -- Sem output tokens
  true,
  'OpenAI Text Embedding 3 Small - Cost-effective embedding model (1536 dimensions)'
),
-- text-embedding-3-large (Highest quality)
(
  'openai',
  'text-embedding-3-large',
  'openai/text-embedding-3-large',
  '{"text": true, "embedding": true}'::jsonb,
  8191,
  NULL,
  0.130,  -- $0.13 por 1M tokens
  0.0,
  true,
  'OpenAI Text Embedding 3 Large - High-quality embedding model (3072 dimensions)'
),
-- text-embedding-ada-002 (Legacy)
(
  'openai',
  'text-embedding-ada-002',
  'openai/text-embedding-ada-002',
  '{"text": true, "embedding": true}'::jsonb,
  8191,
  NULL,
  0.100,  -- $0.10 por 1M tokens
  0.0,
  true,
  'OpenAI Text Embedding Ada-002 - Legacy embedding model (1536 dimensions)'
)
ON CONFLICT (gateway_identifier) DO UPDATE SET
  input_price_per_million = EXCLUDED.input_price_per_million,
  output_price_per_million = EXCLUDED.output_price_per_million,
  updated_at = NOW();

RAISE NOTICE '✅ Modelos de embedding adicionados ao registry';

-- ===================================================================
-- PARTE 2: Tornar coluna phone NULLABLE em gateway_usage_logs
-- ===================================================================

-- Remover constraint NOT NULL da coluna phone
-- Motivo: Embeddings e outras chamadas não têm contexto de telefone
ALTER TABLE gateway_usage_logs
ALTER COLUMN phone DROP NOT NULL;

RAISE NOTICE '✅ Coluna phone agora é NULLABLE em gateway_usage_logs';

-- ===================================================================
-- PARTE 3: Verificação
-- ===================================================================

DO $$
DECLARE
  embedding_models_count INT;
  phone_is_nullable BOOLEAN;
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO DE MIGRAÇÃO ===';

  -- Verificar modelos de embedding
  SELECT COUNT(*) INTO embedding_models_count
  FROM ai_models_registry
  WHERE capabilities->>'embedding' = 'true';

  IF embedding_models_count >= 3 THEN
    RAISE NOTICE '✅ Modelos de embedding: % encontrados', embedding_models_count;
  ELSE
    RAISE WARNING '❌ Modelos de embedding: apenas % encontrados (esperado >= 3)', embedding_models_count;
  END IF;

  -- Verificar se phone é nullable
  SELECT is_nullable = 'YES' INTO phone_is_nullable
  FROM information_schema.columns
  WHERE table_name = 'gateway_usage_logs'
  AND column_name = 'phone';

  IF phone_is_nullable THEN
    RAISE NOTICE '✅ Coluna phone: NULLABLE';
  ELSE
    RAISE WARNING '❌ Coluna phone: ainda NOT NULL';
  END IF;
END $$;

-- ===================================================================
-- ROLLBACK (se necessário)
-- ===================================================================
--
-- Para reverter esta migration:
--
-- -- Remover modelos de embedding
-- DELETE FROM ai_models_registry
-- WHERE gateway_identifier IN (
--   'openai/text-embedding-3-small',
--   'openai/text-embedding-3-large',
--   'openai/text-embedding-ada-002'
-- );
--
-- -- Tornar phone NOT NULL novamente (CUIDADO: pode falhar se houver NULLs)
-- -- UPDATE gateway_usage_logs SET phone = 'unknown' WHERE phone IS NULL;
-- -- ALTER TABLE gateway_usage_logs ALTER COLUMN phone SET NOT NULL;
--
-- ===================================================================
