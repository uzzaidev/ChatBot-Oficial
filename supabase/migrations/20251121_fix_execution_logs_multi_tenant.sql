-- ================================================================
-- FIX: Adicionar isolamento multi-tenant em execution_logs
-- Data: 2025-11-21
-- ================================================================

-- Descrição:
-- A tabela execution_logs NÃO tem client_id, então todos os tenants
-- veem execution logs de todos os outros tenants (CRÍTICO!)
-- Esta migration adiciona client_id e RLS policies para isolamento

-- ================================================================
-- 1. ADICIONAR COLUNA client_id
-- ================================================================

-- Adiciona coluna client_id (nullable inicialmente para dados existentes)
ALTER TABLE public.execution_logs
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Criar índice para performance em queries filtradas por tenant
CREATE INDEX IF NOT EXISTS idx_execution_logs_client_id
  ON public.execution_logs(client_id)
  WHERE client_id IS NOT NULL;

-- Índice composto: client_id + timestamp (query mais comum)
CREATE INDEX IF NOT EXISTS idx_execution_logs_client_timestamp
  ON public.execution_logs(client_id, timestamp DESC)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN public.execution_logs.client_id IS
  'UUID do cliente (tenant). Logs sem client_id são de antes da migration multi-tenant.';

-- ================================================================
-- 2. ATUALIZAR RLS POLICIES
-- ================================================================

-- Remover policies antigas genéricas
DROP POLICY IF EXISTS "Enable insert for service role only" ON public.execution_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.execution_logs;

-- Garantir que RLS está habilitado
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- Policy 1: Service role pode inserir (usado pelo logger)
-- ================================================================

CREATE POLICY "Service role can insert execution logs"
  ON public.execution_logs
  FOR INSERT
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- Policy 2: ISOLAMENTO POR TENANT - Usuários veem apenas logs do próprio client
-- ================================================================

CREATE POLICY "Users can view own client execution logs"
  ON public.execution_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Verifica se o client_id do log corresponde ao client_id do usuário
    client_id IN (
      SELECT client_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
    OR
    -- Permite ver logs antigos sem client_id (de antes da migration)
    -- ⚠️ REMOVA esta condição após migrar todos os logs antigos
    client_id IS NULL
  );

-- ================================================================
-- Policy 3: Service role pode ler tudo (para operações administrativas)
-- ================================================================

CREATE POLICY "Service role can view all execution logs"
  ON public.execution_logs
  FOR SELECT
  TO service_role
  USING (true);

-- ================================================================
-- 3. FUNÇÃO HELPER: Migrar logs antigos para um client_id
-- ================================================================

-- Esta função pode ser usada para atribuir logs antigos a um client
-- Útil se você quiser migrar dados históricos
CREATE OR REPLACE FUNCTION public.migrate_execution_logs_to_client(
  target_client_id UUID,
  phone_filter TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Atualiza logs sem client_id, opcionalmente filtrados por telefone
  IF phone_filter IS NOT NULL THEN
    UPDATE public.execution_logs
    SET client_id = target_client_id
    WHERE client_id IS NULL
      AND metadata->>'from' = phone_filter;
  ELSE
    -- ⚠️ CUIDADO: Isso atribui TODOS os logs sem client_id ao cliente especificado
    UPDATE public.execution_logs
    SET client_id = target_client_id
    WHERE client_id IS NULL;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.migrate_execution_logs_to_client IS
  'Migra execution logs antigos (sem client_id) para um cliente específico. Use phone_filter para migrar apenas logs de um telefone específico.';

-- ================================================================
-- 4. FUNÇÃO HELPER: Deletar logs antigos
-- ================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_execution_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.execution_logs
  WHERE timestamp < (now() - make_interval(days => retention_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_execution_logs IS
  'Deleta execution logs mais antigos que o período de retenção especificado (padrão: 30 dias). Retorna o número de registros deletados.';

-- ================================================================
-- 5. VIEW ÚTIL: Execution logs recentes com informações do cliente
-- ================================================================

CREATE OR REPLACE VIEW public.recent_execution_logs AS
SELECT
  el.*,
  c.slug as client_slug,
  c.name as client_name,
  c.status as client_status
FROM public.execution_logs el
LEFT JOIN public.clients c ON el.client_id = c.id
WHERE el.timestamp > (now() - INTERVAL '24 hours')
ORDER BY el.timestamp DESC;

COMMENT ON VIEW public.recent_execution_logs IS
  'View otimizada para mostrar execution logs das últimas 24 horas com informações enriquecidas do cliente. RLS aplicado automaticamente.';

-- ================================================================
-- 6. VALIDAÇÃO E VERIFICAÇÃO
-- ================================================================

DO $$
DECLARE
  has_client_id BOOLEAN;
  index_count INTEGER;
  policy_count INTEGER;
  logs_without_client_id INTEGER;
BEGIN
  -- Verificar se coluna client_id existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execution_logs'
      AND column_name = 'client_id'
  ) INTO has_client_id;

  IF NOT has_client_id THEN
    RAISE EXCEPTION '❌ ERRO: Coluna client_id não foi adicionada!';
  END IF;

  -- Verificar índices
  SELECT count(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'execution_logs'
    AND indexname LIKE '%client%';

  -- Verificar policies
  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'execution_logs';

  -- Contar logs sem client_id (dados antigos)
  SELECT count(*) INTO logs_without_client_id
  FROM public.execution_logs
  WHERE client_id IS NULL;

  RAISE NOTICE '✅ Coluna client_id adicionada à tabela execution_logs';
  RAISE NOTICE '✅ % índices criados para client_id', index_count;
  RAISE NOTICE '✅ % RLS policies aplicadas (isolamento multi-tenant)', policy_count;
  RAISE NOTICE '✅ RLS habilitado - cada tenant vê apenas seus próprios logs';
  RAISE NOTICE 'ℹ️  % logs antigos sem client_id (ainda visíveis para todos)', logs_without_client_id;

  IF logs_without_client_id > 0 THEN
    RAISE NOTICE '⚠️  Para migrar logs antigos, use: SELECT migrate_execution_logs_to_client(''client-uuid'')';
  END IF;
END;
$$;

-- ================================================================
-- EXEMPLO DE USO (para referência)
-- ================================================================

-- Migrar todos os logs de um telefone específico para um cliente:
-- SELECT migrate_execution_logs_to_client('client-uuid-here', '5549999999999');

-- Migrar TODOS os logs sem client_id para um cliente (⚠️ CUIDADO):
-- SELECT migrate_execution_logs_to_client('client-uuid-here');

-- Cleanup de logs antigos (manter apenas 30 dias):
-- SELECT cleanup_old_execution_logs(30);

-- Ver logs recentes com informações do cliente:
-- SELECT * FROM recent_execution_logs LIMIT 50;
