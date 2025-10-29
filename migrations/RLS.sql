-- =====================================================
-- Row Level Security (RLS) Policies - Multi-Tenant
-- =====================================================
-- Este arquivo implementa políticas de segurança em nível de linha
-- para garantir isolamento de dados entre clientes (multi-tenant)
--
-- Baseado em: MULTI_TENANT_MIGRATION.md (Fase 3 - Autenticação)
--
-- IMPORTANTE:
-- - Execute este arquivo DEPOIS de configurar autenticação Supabase
-- - Certifique-se de que user_profiles está criada
-- - RLS garante que cada cliente veja apenas seus próprios dados
-- =====================================================

-- =====================================================
-- 1. TABELA: user_profiles
-- =====================================================
-- Tabela que vincula usuários autenticados (auth.users) aos clientes
-- 
-- CRIAR SE NÃO EXISTIR:
-- Esta tabela é essencial para o sistema de autenticação multi-tenant

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,

  -- Relacionamento com cliente
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Roles
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'client_admin', 'user')),

  -- Permissões (JSONB para flexibilidade)
  permissions JSONB DEFAULT '{
    "can_view_analytics": true,
    "can_manage_conversations": true,
    "can_edit_settings": false,
    "can_manage_users": false
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('admin', 'client_admin', 'user'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_client ON user_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Trigger para auto-update timestamp
CREATE TRIGGER IF NOT EXISTS update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TRIGGER: Auto-create user_profile on signup
-- =====================================================
-- Quando um novo usuário se cadastra via Supabase Auth,
-- automaticamente cria um registro em user_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, client_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    (NEW.raw_user_meta_data->>'client_id')::UUID,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. RLS POLICIES - user_profiles
-- =====================================================

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Política 2: Usuários podem atualizar seu próprio perfil (exceto client_id e role)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política 3: Client admins podem ver membros do time
DROP POLICY IF EXISTS "Client admins can view team members" ON user_profiles;
CREATE POLICY "Client admins can view team members"
  ON user_profiles FOR SELECT
  USING (
    client_id = (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('client_admin', 'admin')
      OR id = auth.uid()
    )
  );

-- Política 4: Admins globais podem ver tudo
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- 4. RLS POLICIES - clients
-- =====================================================
-- Configuração dos clientes (apenas leitura para usuários autenticados)

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver apenas seu próprio cliente
DROP POLICY IF EXISTS "Users can view own client" ON clients;
CREATE POLICY "Users can view own client"
  ON clients FOR SELECT
  USING (
    id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 2: Admins podem ver todos os clientes
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Política 3: Client admins podem atualizar seu próprio cliente
DROP POLICY IF EXISTS "Client admins can update own client" ON clients;
CREATE POLICY "Client admins can update own client"
  ON clients FOR UPDATE
  USING (
    id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'client_admin'
  )
  WITH CHECK (
    id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 4: Service role tem acesso total (API backend)
DROP POLICY IF EXISTS "Service role can access all clients" ON clients;
CREATE POLICY "Service role can access all clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 5. RLS POLICIES - conversations
-- =====================================================
-- Conversas do WhatsApp (filtradas por client_id)

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver conversas do seu cliente
DROP POLICY IF EXISTS "Users can view own client conversations" ON conversations;
CREATE POLICY "Users can view own client conversations"
  ON conversations FOR SELECT
  USING (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 2: Usuários podem inserir conversas
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
CREATE POLICY "Users can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 3: Usuários podem atualizar conversas (status, assigned_to)
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;
CREATE POLICY "Users can update conversations"
  ON conversations FOR UPDATE
  USING (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 4: Service role tem acesso total
DROP POLICY IF EXISTS "Service role can access all conversations" ON conversations;
CREATE POLICY "Service role can access all conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. RLS POLICIES - messages
-- =====================================================
-- Mensagens individuais (filtradas por client_id)

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver mensagens do seu cliente
DROP POLICY IF EXISTS "Users can view own client messages" ON messages;
CREATE POLICY "Users can view own client messages"
  ON messages FOR SELECT
  USING (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 2: Usuários podem inserir mensagens
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 3: Service role tem acesso total
DROP POLICY IF EXISTS "Service role can access all messages" ON messages;
CREATE POLICY "Service role can access all messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 7. RLS POLICIES - usage_logs
-- =====================================================
-- Logs de uso (API calls, tokens, custos)

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver logs do seu cliente
DROP POLICY IF EXISTS "Users can view own client usage logs" ON usage_logs;
CREATE POLICY "Users can view own client usage logs"
  ON usage_logs FOR SELECT
  USING (
    client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );

-- Política 2: Service role tem acesso total
DROP POLICY IF EXISTS "Service role can access all usage logs" ON usage_logs;
CREATE POLICY "Service role can access all usage logs"
  ON usage_logs FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 8. RLS POLICIES - clientes_whatsapp (Legacy)
-- =====================================================
-- Tabela legada do n8n (agora com client_id)
-- IMPORTANTE: Verificar se esta tabela existe antes de aplicar

DO $$
BEGIN
  -- Verificar se tabela existe
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'clientes_whatsapp') THEN
    
    -- Verificar se coluna client_id existe
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'clientes_whatsapp' 
      AND column_name = 'client_id'
    ) THEN
      
      -- Habilitar RLS
      ALTER TABLE clientes_whatsapp ENABLE ROW LEVEL SECURITY;
      
      -- Política 1: Usuários podem ver clientes WhatsApp do seu cliente
      DROP POLICY IF EXISTS "Users can view own client whatsapp customers" ON clientes_whatsapp;
      CREATE POLICY "Users can view own client whatsapp customers"
        ON clientes_whatsapp FOR SELECT
        USING (
          client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
        );
      
      -- Política 2: Service role tem acesso total
      DROP POLICY IF EXISTS "Service role can access all whatsapp customers" ON clientes_whatsapp;
      CREATE POLICY "Service role can access all whatsapp customers"
        ON clientes_whatsapp FOR ALL
        USING (auth.role() = 'service_role');
      
      RAISE NOTICE 'RLS habilitado para clientes_whatsapp';
    ELSE
      RAISE WARNING 'Tabela clientes_whatsapp existe mas não tem coluna client_id. Pulando RLS.';
    END IF;
  ELSE
    RAISE NOTICE 'Tabela clientes_whatsapp não existe. Pulando RLS.';
  END IF;
END $$;

-- =====================================================
-- 9. RLS POLICIES - n8n_chat_histories (Legacy)
-- =====================================================
-- Histórico de chat do n8n (agora com client_id)
-- IMPORTANTE: Verificar se esta tabela existe antes de aplicar

DO $$
BEGIN
  -- Verificar se tabela existe
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'n8n_chat_histories') THEN
    
    -- Verificar se coluna client_id existe
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'n8n_chat_histories' 
      AND column_name = 'client_id'
    ) THEN
      
      -- Habilitar RLS
      ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
      
      -- Política 1: Usuários podem ver histórico do seu cliente
      DROP POLICY IF EXISTS "Users can view own client chat histories" ON n8n_chat_histories;
      CREATE POLICY "Users can view own client chat histories"
        ON n8n_chat_histories FOR SELECT
        USING (
          client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
        );
      
      -- Política 2: Service role tem acesso total
      DROP POLICY IF EXISTS "Service role can access all chat histories" ON n8n_chat_histories;
      CREATE POLICY "Service role can access all chat histories"
        ON n8n_chat_histories FOR ALL
        USING (auth.role() = 'service_role');
      
      RAISE NOTICE 'RLS habilitado para n8n_chat_histories';
    ELSE
      RAISE WARNING 'Tabela n8n_chat_histories existe mas não tem coluna client_id. Pulando RLS.';
    END IF;
  ELSE
    RAISE NOTICE 'Tabela n8n_chat_histories não existe. Pulando RLS.';
  END IF;
END $$;

-- =====================================================
-- 10. RLS POLICIES - documents (RAG Knowledge Base)
-- =====================================================
-- Documentos para RAG (se existir coluna client_id)
-- NOTA: Esta tabela pode não ter client_id ainda (ver MULTI_TENANT_MIGRATION.md)

DO $$
BEGIN
  -- Verificar se tabela existe
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'documents') THEN
    
    -- Verificar se coluna client_id existe
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'client_id'
    ) THEN
      
      -- Habilitar RLS
      ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
      
      -- Política 1: Usuários podem ver documentos do seu cliente
      DROP POLICY IF EXISTS "Users can view own client documents" ON documents;
      CREATE POLICY "Users can view own client documents"
        ON documents FOR SELECT
        USING (
          client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
        );
      
      -- Política 2: Client admins podem gerenciar documentos
      DROP POLICY IF EXISTS "Client admins can manage documents" ON documents;
      CREATE POLICY "Client admins can manage documents"
        ON documents FOR ALL
        USING (
          client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
          AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('client_admin', 'admin')
        )
        WITH CHECK (
          client_id = (SELECT client_id FROM user_profiles WHERE id = auth.uid())
        );
      
      -- Política 3: Service role tem acesso total
      DROP POLICY IF EXISTS "Service role can access all documents" ON documents;
      CREATE POLICY "Service role can access all documents"
        ON documents FOR ALL
        USING (auth.role() = 'service_role');
      
      RAISE NOTICE 'RLS habilitado para documents';
    ELSE
      RAISE WARNING 'Tabela documents existe mas não tem coluna client_id. Pulando RLS.';
      RAISE WARNING 'AÇÃO NECESSÁRIA: Adicionar coluna client_id à tabela documents';
    END IF;
  ELSE
    RAISE NOTICE 'Tabela documents não existe. Pulando RLS.';
  END IF;
END $$;

-- =====================================================
-- 11. HELPER FUNCTION - Get user client_id
-- =====================================================
-- Função helper para facilitar obter client_id do usuário atual

CREATE OR REPLACE FUNCTION auth.user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION auth.user_client_id IS 'Retorna o client_id do usuário autenticado atual';

-- =====================================================
-- 12. HELPER FUNCTION - Get user role
-- =====================================================
-- Função helper para facilitar obter role do usuário atual

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION auth.user_role IS 'Retorna o role do usuário autenticado atual';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Listar todas as políticas RLS criadas
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== POLÍTICAS RLS CRIADAS ===';
  FOR r IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE 'Tabela: % | Política: %', r.tablename, r.policyname;
  END LOOP;
END $$;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. EXECUÇÃO:
--    - Execute este arquivo no Supabase SQL Editor
--    - Certifique-se de estar no ambiente correto (dev/prod)
--    - Revise as mensagens de NOTICE/WARNING
--
-- 2. ORDEM DE MIGRAÇÃO:
--    - Primeiro: migration.sql (cria tabelas base)
--    - Segundo: RLS.sql (este arquivo - políticas de segurança)
--    - Terceiro: Configurar autenticação no Supabase Dashboard
--
-- 3. TESTES RECOMENDADOS:
--    - Criar 2 usuários em clientes diferentes
--    - Tentar acessar dados do outro cliente (deve falhar)
--    - Verificar isolamento de conversas, mensagens, etc.
--    - Testar com roles diferentes (user, client_admin, admin)
--
-- 4. ROLLBACK:
--    Para desabilitar RLS temporariamente (CUIDADO!):
--    ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
--
-- 5. MONITORAMENTO:
--    - Logs do Supabase mostrarão queries bloqueadas por RLS
--    - Use EXPLAIN para ver se RLS está sendo aplicado
--
-- 6. PERFORMANCE:
--    - RLS adiciona overhead mínimo (<5ms normalmente)
--    - Índices em client_id são essenciais (já criados)
--    - Considere materializar user_client_id em session se necessário
--
-- =====================================================
-- FIM DO ARQUIVO RLS.sql
-- =====================================================
