-- ================================================================
-- FIX: Migrar audit_logs para schema multi-tenant com client_id UUID
-- Data: 2025-11-21
-- ================================================================

-- Descrição:
-- A tabela audit_logs existente usa tenant_id INTEGER (do sistema de poker)
-- Precisamos migrar para client_id UUID para consistência com o chatbot
-- Esta migration preserva dados antigos (se houver) e cria schema correto

-- ================================================================
-- 1. BACKUP DA TABELA ANTIGA (se existir)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    -- Renomeia tabela antiga para backup
    ALTER TABLE public.audit_logs RENAME TO audit_logs_backup_poker_system;

    RAISE NOTICE '✅ Tabela audit_logs antiga renomeada para audit_logs_backup_poker_system';
  ELSE
    RAISE NOTICE 'ℹ️  Tabela audit_logs não existe - será criada do zero';
  END IF;
END;
$$;

-- ================================================================
-- 2. CRIAR TABELA NOVA COM SCHEMA CORRETO
-- ================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Identificação do usuário
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,

  -- ⚠️ IMPORTANTE: Usar client_id UUID, não tenant_id INTEGER
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Tipo de operação
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'READ'
  resource_type TEXT NOT NULL, -- 'user', 'client', 'secret', 'config', etc
  resource_id TEXT, -- ID do recurso afetado

  -- Contexto da operação
  endpoint TEXT, -- API endpoint chamado (ex: '/api/admin/users')
  method TEXT, -- HTTP method (GET, POST, PUT, DELETE)

  -- Detalhes da mudança
  changes JSONB, -- Antes/depois para UPDATE, payload para CREATE
  metadata JSONB, -- Informações adicionais (IP, user agent, etc)

  -- Status da operação
  status TEXT NOT NULL DEFAULT 'success', -- 'success' ou 'failure'
  error_message TEXT,

  -- Performance tracking
  duration_ms INTEGER, -- Duração da operação em milissegundos

  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure'))
);

-- ================================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- ================================================================

-- Índice principal: buscar por timestamp (queries mais comuns)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

-- Índice para filtrar por usuário
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON public.audit_logs(user_id)
  WHERE user_id IS NOT NULL;

-- ⚠️ MUDANÇA: Usar client_id em vez de tenant_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id
  ON public.audit_logs(client_id)
  WHERE client_id IS NOT NULL;

-- Índice para buscar por tipo de recurso
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON public.audit_logs(resource_type, resource_id);

-- Índice para buscar por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action);

-- Índice composto: usuário + timestamp (para user activity timeline)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity
  ON public.audit_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ⚠️ MUDANÇA: Usar client_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_activity
  ON public.audit_logs(client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

-- ================================================================
-- 4. CONFIGURAR RLS (Row Level Security) COM ISOLAMENTO POR TENANT
-- ================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Service role has full access to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Client admins can view own client audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;

-- Policy 1: Service role tem acesso total (para logging via API)
CREATE POLICY "Service role has full access to audit logs"
  ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ⚠️ Policy 2: ISOLAMENTO POR TENANT - Usuários veem apenas logs do próprio client
CREATE POLICY "Users can view own client audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Verifica se o client_id do log corresponde ao client_id do usuário
    client_id IN (
      SELECT client_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy 3: Usuários podem ver seus próprios logs (independente de client)
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ================================================================
-- 5. CRIAR VIEWS ÚTEIS (COM client_id)
-- ================================================================

-- Drop views antigas se existirem
DROP VIEW IF EXISTS public.recent_audit_activity CASCADE;
DROP VIEW IF EXISTS public.suspicious_audit_activity CASCADE;

-- View: Últimas atividades (últimas 24h) - POR TENANT
CREATE OR REPLACE VIEW public.recent_audit_activity AS
SELECT
  al.*,
  up.email as user_email_from_profile,
  up.full_name as user_name,
  c.slug as client_slug,
  c.name as client_name
FROM public.audit_logs al
LEFT JOIN public.user_profiles up ON al.user_id = up.id
LEFT JOIN public.clients c ON al.client_id = c.id
WHERE al.created_at > (now() - INTERVAL '24 hours')
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.recent_audit_activity IS
  'View otimizada para mostrar atividades das últimas 24 horas com informações enriquecidas (email, client slug). RLS aplicado automaticamente.';

-- View: Atividades suspeitas - POR TENANT
CREATE OR REPLACE VIEW public.suspicious_audit_activity AS
SELECT
  al.*,
  up.email as user_email_from_profile,
  up.full_name as user_name,
  c.slug as client_slug,
  c.name as client_name
FROM public.audit_logs al
LEFT JOIN public.user_profiles up ON al.user_id = up.id
LEFT JOIN public.clients c ON al.client_id = c.id
WHERE
  al.status = 'failure'
  OR al.action = 'DELETE'
  OR al.resource_type IN ('secret', 'user')
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.suspicious_audit_activity IS
  'View para detectar atividades suspeitas: falhas, deleções, operações em recursos sensíveis. RLS aplicado automaticamente.';

-- ================================================================
-- 6. CRIAR FUNÇÃO HELPER PARA CLEANUP AUTOMÁTICO
-- ================================================================

-- Função para deletar logs antigos (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (now() - make_interval(days => retention_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_audit_logs IS
  'Deleta logs de auditoria mais antigos que o período de retenção especificado (padrão: 90 dias). Retorna o número de registros deletados.';

-- ================================================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- ================================================================

COMMENT ON TABLE public.audit_logs IS
  'Audit trail para operações sensíveis. Isolamento multi-tenant por client_id (UUID). Todas as operações de CRUD em recursos críticos são registradas automaticamente.';

COMMENT ON COLUMN public.audit_logs.client_id IS
  'UUID do cliente (tenant). RLS policies garantem que cada tenant vê apenas seus próprios logs.';

COMMENT ON COLUMN public.audit_logs.action IS
  'Tipo de operação: CREATE, READ, UPDATE, DELETE';

COMMENT ON COLUMN public.audit_logs.resource_type IS
  'Tipo de recurso afetado: user, client, secret, config, bot_config, flow_node, invite, pricing_config, usage_log';

COMMENT ON COLUMN public.audit_logs.changes IS
  'JSON com detalhes da mudança (dados sensíveis são sanitizados automaticamente pelo helper src/lib/audit.ts)';

-- ================================================================
-- 8. VALIDAÇÃO E VERIFICAÇÃO
-- ================================================================

DO $$
DECLARE
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Verificar tabela
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE EXCEPTION '❌ ERRO: Tabela audit_logs não foi criada!';
  END IF;

  -- Verificar índices
  SELECT count(*) INTO index_count FROM pg_indexes WHERE tablename = 'audit_logs';

  -- Verificar policies
  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'audit_logs';

  -- Verificar views
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'recent_audit_activity') THEN
    RAISE EXCEPTION '❌ ERRO: View recent_audit_activity não foi criada!';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'suspicious_audit_activity') THEN
    RAISE EXCEPTION '❌ ERRO: View suspicious_audit_activity não foi criada!';
  END IF;

  RAISE NOTICE '✅ Tabela audit_logs criada/migrada com sucesso (schema com client_id UUID)';
  RAISE NOTICE '✅ % índices criados', index_count;
  RAISE NOTICE '✅ % RLS policies aplicadas', policy_count;
  RAISE NOTICE '✅ RLS habilitado - isolamento multi-tenant por client_id';
  RAISE NOTICE '✅ 2 views criadas (recent_audit_activity, suspicious_audit_activity)';
  RAISE NOTICE '✅ Função cleanup_old_audit_logs criada';
  RAISE NOTICE 'ℹ️  Tabela antiga (se existia) renomeada para audit_logs_backup_poker_system';
END;
$$;

-- ================================================================
-- EXEMPLO DE USO (para referência)
-- ================================================================

-- Buscar audit logs do próprio tenant (RLS aplica filtro automaticamente):
-- SELECT * FROM public.audit_logs
-- ORDER BY created_at DESC LIMIT 50;
--
-- Buscar atividades suspeitas do próprio tenant:
-- SELECT * FROM public.suspicious_audit_activity LIMIT 50;
--
-- Cleanup de logs antigos (manter apenas 90 dias):
-- SELECT public.cleanup_old_audit_logs(90);
