-- =====================================================
-- ADD: Operation Type Helpers (usando metadata JSONB)
-- =====================================================
-- Este script NÃO cria novas colunas.
-- Usa o campo metadata (JSONB) que já existe para armazenar operation_type.
--
-- Tipos de operação:
-- - 'transcription' → Whisper (áudio)
-- - 'vision' → GPT-4o Vision (imagem)
-- - 'pdf_summary' → GPT-4o (PDF)
-- - 'chat' → Groq ou OpenAI (chat)
-- - 'embedding' → OpenAI Embeddings (RAG)
-- =====================================================

-- =====================================================
-- FUNÇÃO 1: Query com filtro por operation_type
-- =====================================================

CREATE OR REPLACE FUNCTION get_usage_by_operation_type(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  source TEXT,
  model TEXT,
  operation_type TEXT,
  total_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    COALESCE(ul.model, 'unknown') as model,
    COALESCE(ul.metadata->>'operation_type', 'unknown') as operation_type,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.source, ul.model, ul.metadata->>'operation_type'
  ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_usage_by_operation_type IS 'Retorna uso de APIs agrupado por tipo de operação (transcription, vision, pdf_summary, chat, embedding)';

-- =====================================================
-- FUNÇÃO 2: Update metadata para logs existentes
-- =====================================================

CREATE OR REPLACE FUNCTION backfill_operation_type()
RETURNS TABLE (
  updated_count INTEGER
) AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- 1. Whisper → transcription
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "transcription"}'::JSONB
  WHERE source = 'whisper'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 2. Groq → chat
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "chat"}'::JSONB
  WHERE source = 'groq'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 3. OpenAI text-embedding → embedding
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "embedding"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'text-embedding%'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 4. OpenAI gpt-4o sem conversation_id → vision ou pdf_summary
  -- (Não podemos diferenciar automaticamente, deixar como 'unknown')
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "unknown"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'gpt-4%'
    AND conversation_id IS NULL
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 5. OpenAI gpt-4o com conversation_id → chat
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "chat"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'gpt-4%'
    AND conversation_id IS NOT NULL
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION backfill_operation_type IS 'Atualiza logs existentes com operation_type baseado em heurísticas (whisper=transcription, groq=chat, etc)';

-- =====================================================
-- QUERY DE VERIFICAÇÃO
-- =====================================================

-- Ver distribuição de operation_types
SELECT
  source,
  model,
  metadata->>'operation_type' as operation_type,
  COUNT(*) as count
FROM usage_logs
GROUP BY source, model, metadata->>'operation_type'
ORDER BY count DESC;

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

-- Executar backfill (preencher logs existentes)
SELECT backfill_operation_type();

-- Ver uso por tipo de operação (últimos 30 dias)
SELECT * FROM get_usage_by_operation_type(
  (SELECT id FROM clients LIMIT 1), -- seu client_id
  30
);

-- =====================================================
-- QUERY PARA ANALYTICS DASHBOARD
-- =====================================================

-- Custo por tipo de operação (últimos 7 dias)
SELECT
  CASE
    WHEN source = 'whisper' THEN '🎤 Áudio (Whisper)'
    WHEN source = 'groq' THEN '💬 Chat (Groq)'
    WHEN source = 'openai' AND model LIKE 'text-embedding%' THEN '🔍 RAG (Embeddings)'
    WHEN source = 'openai' AND metadata->>'operation_type' = 'vision' THEN '🖼️ Imagem (Vision)'
    WHEN source = 'openai' AND metadata->>'operation_type' = 'pdf_summary' THEN '📄 PDF (GPT-4o)'
    WHEN source = 'openai' AND metadata->>'operation_type' = 'chat' THEN '💬 Chat (GPT-4o)'
    ELSE '❓ Outros'
  END as operation,
  COUNT(*) as requests,
  SUM(total_tokens) as total_tokens,
  ROUND(SUM(cost_usd)::NUMERIC, 4) as total_cost_usd
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY
  source,
  model,
  metadata->>'operation_type'
ORDER BY total_cost_usd DESC;

-- =====================================================
-- NOTAS
-- =====================================================
-- 1. O código TypeScript precisa passar metadata ao logar:
--    logOpenAIUsage(..., { operation_type: 'vision' })
--
-- 2. Para logs antigos sem operation_type, use backfill_operation_type()
--
-- 3. Não é possível diferenciar automaticamente Vision vs PDF vs Chat
--    em logs antigos (todos são openai + gpt-4o)
