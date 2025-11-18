-- ================================================================
-- VULN-008 FIX: Implementação de Audit Trail
-- Data: 2025-11-18
-- Sprint 2 - Task 2.1
-- ================================================================

-- Descrição:
-- Cria tabela de audit log para registrar todas as operações
-- sensíveis realizadas com service role (bypass de RLS)
-- Essencial para conformidade, troubleshooting e detecção de anomalias

-- ================================================================
-- 1. CRIAR TABELA DE AUDIT LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamp (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Identificação do usuário
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  
  -- Identificação do cliente (tenant)
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
  
  -- Índices para queries comuns
  CONSTRAINT valid_action CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure'))
);

-- ================================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ================================================================

-- Índice principal: buscar por timestamp (queries mais comuns)
CREATE INDEX idx_audit_logs_created_at 
  ON public.audit_logs(created_at DESC);

-- Índice para filtrar por usuário
CREATE INDEX idx_audit_logs_user_id 
  ON public.audit_logs(user_id) 
  WHERE user_id IS NOT NULL;

-- Índice para filtrar por cliente (tenant isolation)
CREATE INDEX idx_audit_logs_client_id 
  ON public.audit_logs(client_id) 
  WHERE client_id IS NOT NULL;

-- Índice para buscar por tipo de recurso
CREATE INDEX idx_audit_logs_resource 
  ON public.audit_logs(resource_type, resource_id);

-- Índice para buscar por ação
CREATE INDEX idx_audit_logs_action 
  ON public.audit_logs(action);

-- Índice composto: usuário + timestamp (para user activity timeline)
CREATE INDEX idx_audit_logs_user_activity 
  ON public.audit_logs(user_id, created_at DESC) 
  WHERE user_id IS NOT NULL;

-- Índice composto: cliente + timestamp (para client activity timeline)
CREATE INDEX idx_audit_logs_client_activity 
  ON public.audit_logs(client_id, created_at DESC) 
  WHERE client_id IS NOT NULL;

-- ================================================================
-- 3. CONFIGURAR RLS (Row Level Security)
-- ================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role tem acesso total (para logging via API)
CREATE POLICY "Service role has full access to audit logs"
  ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Admins podem ler logs (readonly)
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'client_admin')
      AND is_active = true
    )
  );

-- Policy 3: Client admins veem apenas logs do seu cliente
CREATE POLICY "Client admins can view own client audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'client_admin'
      AND is_active = true
    )
  );

-- Policy 4: Usuários comuns podem ver seus próprios logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ================================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- ================================================================

COMMENT ON TABLE public.audit_logs IS 
  'VULN-008 FIX: Audit trail para operações sensíveis realizadas com service role. Registra todas as operações de CRUD em recursos críticos para conformidade e troubleshooting.';

COMMENT ON COLUMN public.audit_logs.action IS 
  'Tipo de operação: CREATE, READ, UPDATE, DELETE';

COMMENT ON COLUMN public.audit_logs.resource_type IS 
  'Tipo de recurso afetado: user, client, secret, config, bot_config, flow_node, etc';

COMMENT ON COLUMN public.audit_logs.resource_id IS 
  'ID do recurso afetado (UUID ou string dependendo do tipo)';

COMMENT ON COLUMN public.audit_logs.changes IS 
  'JSON com detalhes da mudança. Para UPDATE: {before: {...}, after: {...}}. Para CREATE: {payload: {...}}. Para DELETE: {deleted: {...}}';

COMMENT ON COLUMN public.audit_logs.metadata IS 
  'JSON com contexto adicional: {ip: "...", user_agent: "...", request_id: "...", etc}';

COMMENT ON COLUMN public.audit_logs.duration_ms IS 
  'Duração da operação em milissegundos (útil para detectar operações lentas)';

-- ================================================================
-- 5. CRIAR FUNÇÃO HELPER PARA CLEANUP AUTOMÁTICO
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
-- 6. CRIAR VIEWS ÚTEIS
-- ================================================================

-- View: Últimas atividades (últimas 24h)
CREATE OR REPLACE VIEW public.recent_audit_activity AS
SELECT 
  al.*,
  up.email as user_email_from_profile,
  c.slug as client_slug
FROM public.audit_logs al
LEFT JOIN public.user_profiles up ON al.user_id = up.id
LEFT JOIN public.clients c ON al.client_id = c.id
WHERE al.created_at > (now() - INTERVAL '24 hours')
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.recent_audit_activity IS 
  'View otimizada para mostrar atividades das últimas 24 horas com informações enriquecidas (email, client slug)';

-- View: Atividades suspeitas (falhas, operações deletadas)
CREATE OR REPLACE VIEW public.suspicious_audit_activity AS
SELECT 
  al.*,
  up.email as user_email_from_profile,
  c.slug as client_slug
FROM public.audit_logs al
LEFT JOIN public.user_profiles up ON al.user_id = up.id
LEFT JOIN public.clients c ON al.client_id = c.id
WHERE 
  al.status = 'failure'
  OR al.action = 'DELETE'
  OR al.resource_type IN ('secret', 'user')
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.suspicious_audit_activity IS 
  'View para detectar atividades suspeitas: falhas, deleções, operações em recursos sensíveis (secrets, users)';

-- ================================================================
-- 7. VALIDAÇÃO E VERIFICAÇÃO
-- ================================================================

-- Testar que a tabela foi criada corretamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE EXCEPTION 'ERRO: Tabela audit_logs não foi criada!';
  END IF;
  
  RAISE NOTICE '✅ Tabela audit_logs criada com sucesso';
  RAISE NOTICE '✅ % índices criados', (SELECT count(*) FROM pg_indexes WHERE tablename = 'audit_logs');
  RAISE NOTICE '✅ RLS habilitado e policies aplicadas';
  RAISE NOTICE '✅ Views criadas (recent_audit_activity, suspicious_audit_activity)';
  RAISE NOTICE '✅ Função cleanup_old_audit_logs criada';
END;
$$;

-- ================================================================
-- EXEMPLO DE USO (para referência)
-- ================================================================

-- Inserir log de auditoria manualmente:
-- INSERT INTO public.audit_logs (
--   user_id, user_email, user_role, client_id,
--   action, resource_type, resource_id,
--   endpoint, method, changes, metadata, status
-- ) VALUES (
--   'user-uuid', 'admin@example.com', 'admin', 'client-uuid',
--   'UPDATE', 'secret', 'openai_api_key',
--   '/api/vault/secrets', 'PUT',
--   '{"before": "***old", "after": "***new"}'::jsonb,
--   '{"ip": "192.168.1.1", "user_agent": "..."}'::jsonb,
--   'success'
-- );

-- Buscar atividades de um usuário:
-- SELECT * FROM public.audit_logs 
-- WHERE user_id = 'user-uuid' 
-- ORDER BY created_at DESC LIMIT 50;

-- Buscar mudanças em secrets:
-- SELECT * FROM public.audit_logs 
-- WHERE resource_type = 'secret' 
-- ORDER BY created_at DESC;

-- Cleanup de logs antigos (manter apenas 90 dias):
-- SELECT public.cleanup_old_audit_logs(90);
