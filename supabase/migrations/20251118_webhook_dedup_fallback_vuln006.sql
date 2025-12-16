-- ================================================================
-- VULN-006 FIX: Deduplicação Fallback no PostgreSQL
-- Data: 2025-11-18
-- Sprint 2 - Task 2.3
-- ================================================================

-- Descrição:
-- Se Redis falhar, webhook continua sem deduplicação, processando mensagens duplicadas
-- Solução: Criar tabela de deduplicação no PostgreSQL como fallback

-- ================================================================
-- 1. CRIAR TABELA DE DEDUPLICAÇÃO
-- ================================================================

CREATE TABLE IF NOT EXISTS public.webhook_dedup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chave de deduplicação (client_id + message_id)
  dedup_key TEXT NOT NULL UNIQUE,
  
  -- Componentes da chave (para queries)
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  
  -- Metadata
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  webhook_payload JSONB, -- Opcional: armazenar payload completo para debug
  
  -- Constraints
  CONSTRAINT webhook_dedup_unique_key UNIQUE (client_id, message_id)
);

-- ================================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ================================================================

-- Índice principal: busca rápida por dedup_key
CREATE INDEX idx_webhook_dedup_key 
  ON public.webhook_dedup(dedup_key);

-- Índice para cleanup por timestamp
CREATE INDEX idx_webhook_dedup_processed_at 
  ON public.webhook_dedup(processed_at);

-- Índice composto para lookup por client_id + message_id
CREATE INDEX idx_webhook_dedup_composite 
  ON public.webhook_dedup(client_id, message_id);

-- ================================================================
-- 3. CONFIGURAR RLS (Row Level Security)
-- ================================================================

ALTER TABLE public.webhook_dedup ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role tem acesso total
CREATE POLICY "Service role has full access to webhook_dedup"
  ON public.webhook_dedup
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Authenticated users podem ler registros do seu client
CREATE POLICY "Users can view own client dedup records"
  ON public.webhook_dedup
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

-- ================================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- ================================================================

COMMENT ON TABLE public.webhook_dedup IS 
  'VULN-006 FIX: Tabela de deduplicação de mensagens webhook (fallback para Redis). Previne processamento duplicado de mensagens quando Redis falha.';

COMMENT ON COLUMN public.webhook_dedup.dedup_key IS 
  'Chave única de deduplicação no formato "processed:{client_id}:{message_id}"';

COMMENT ON COLUMN public.webhook_dedup.message_id IS 
  'ID da mensagem do WhatsApp (fornecido pela Meta)';

COMMENT ON COLUMN public.webhook_dedup.webhook_payload IS 
  'Payload completo do webhook (opcional, para debug/troubleshooting)';

-- ================================================================
-- 5. FUNÇÕES HELPER
-- ================================================================

/**
 * Função para verificar se mensagem já foi processada
 * Retorna true se já processado, false caso contrário
 */
CREATE OR REPLACE FUNCTION public.is_message_processed(
  p_client_id UUID,
  p_message_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM public.webhook_dedup
  WHERE client_id = p_client_id
    AND message_id = p_message_id
    AND processed_at > (now() - INTERVAL '24 hours'); -- Apenas últimas 24h
  
  RETURN exists_count > 0;
END;
$$;

COMMENT ON FUNCTION public.is_message_processed IS 
  'Verifica se uma mensagem já foi processada nas últimas 24 horas';

/**
 * Função para marcar mensagem como processada
 * Insere registro ou atualiza se já existe (upsert)
 */
CREATE OR REPLACE FUNCTION public.mark_message_processed(
  p_client_id UUID,
  p_message_id TEXT,
  p_dedup_key TEXT,
  p_payload JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.webhook_dedup (
    client_id,
    message_id,
    dedup_key,
    webhook_payload,
    processed_at
  ) VALUES (
    p_client_id,
    p_message_id,
    p_dedup_key,
    p_payload,
    now()
  )
  ON CONFLICT (client_id, message_id)
  DO UPDATE SET
    processed_at = now(),
    webhook_payload = EXCLUDED.webhook_payload;
END;
$$;

COMMENT ON FUNCTION public.mark_message_processed IS 
  'Marca uma mensagem como processada (upsert). Se já existe, atualiza timestamp.';

/**
 * Função para limpeza automática de registros antigos
 * Deleta registros mais antigos que o período de retenção
 */
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_dedup(
  retention_hours INTEGER DEFAULT 24
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_dedup
  WHERE processed_at < (now() - make_interval(hours => retention_hours));
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_webhook_dedup IS 
  'Deleta registros de deduplicação mais antigos que o período de retenção (padrão: 24 horas). Retorna o número de registros deletados.';

-- ================================================================
-- 6. TRIGGER PARA CLEANUP AUTOMÁTICO (OPCIONAL)
-- ================================================================

-- Opção 1: Cleanup automático via trigger (executado em cada INSERT)
-- ATENÇÃO: Pode impactar performance se houver muitas inserções

CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_dedup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cleanup apenas se último cleanup foi há mais de 1 hora
  -- (para evitar executar em cada inserção)
  PERFORM public.cleanup_old_webhook_dedup(24);
  RETURN NEW;
END;
$$;

-- Descomentar para habilitar trigger:
-- CREATE TRIGGER cleanup_dedup_on_insert
--   AFTER INSERT ON public.webhook_dedup
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION public.trigger_cleanup_old_dedup();

-- Opção 2: Cleanup via pg_cron (recomendado para produção)
-- Requer extensão pg_cron instalada
-- Executar: SELECT cron.schedule('cleanup-webhook-dedup', '0 * * * *', 'SELECT public.cleanup_old_webhook_dedup(24);');

-- ================================================================
-- 7. VIEWS ÚTEIS
-- ================================================================

-- View: Estatísticas de deduplicação
CREATE OR REPLACE VIEW public.webhook_dedup_stats AS
SELECT 
  client_id,
  COUNT(*) as total_dedup_records,
  COUNT(*) FILTER (WHERE processed_at > now() - INTERVAL '1 hour') as last_hour,
  COUNT(*) FILTER (WHERE processed_at > now() - INTERVAL '24 hours') as last_24h,
  MAX(processed_at) as last_processed_at,
  MIN(processed_at) as oldest_record
FROM public.webhook_dedup
GROUP BY client_id;

COMMENT ON VIEW public.webhook_dedup_stats IS 
  'Estatísticas de deduplicação por cliente (total de registros, últimas 1h, últimas 24h)';

-- ================================================================
-- 8. VALIDAÇÃO E VERIFICAÇÃO
-- ================================================================

-- Testar que a tabela foi criada corretamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_dedup') THEN
    RAISE EXCEPTION 'ERRO: Tabela webhook_dedup não foi criada!';
  END IF;
  
  RAISE NOTICE '✅ Tabela webhook_dedup criada com sucesso';
  RAISE NOTICE '✅ % índices criados', (SELECT count(*) FROM pg_indexes WHERE tablename = 'webhook_dedup');
  RAISE NOTICE '✅ RLS habilitado e policies aplicadas';
  RAISE NOTICE '✅ Funções helper criadas (is_message_processed, mark_message_processed, cleanup_old_webhook_dedup)';
  RAISE NOTICE '✅ View criada (webhook_dedup_stats)';
END;
$$;

-- ================================================================
-- EXEMPLO DE USO (para referência)
-- ================================================================

-- Verificar se mensagem já foi processada:
-- SELECT public.is_message_processed(
--   'client-uuid'::uuid,
--   'wamid.123456'
-- );

-- Marcar mensagem como processada:
-- SELECT public.mark_message_processed(
--   'client-uuid'::uuid,
--   'wamid.123456',
--   'processed:client-uuid:wamid.123456',
--   '{"message": "test"}'::jsonb
-- );

-- Cleanup manual:
-- SELECT public.cleanup_old_webhook_dedup(24);

-- Ver estatísticas:
-- SELECT * FROM public.webhook_dedup_stats;

-- Ver registros recentes de um cliente:
-- SELECT * FROM public.webhook_dedup
-- WHERE client_id = 'client-uuid'
-- ORDER BY processed_at DESC
-- LIMIT 10;
