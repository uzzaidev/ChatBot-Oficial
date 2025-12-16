-- ============================================================================
-- MIGRATION 005: FASE 1 - Multi-Tenant com Supabase Vault
-- ============================================================================
-- Objetivo: Preparar infraestrutura multi-tenant com secrets criptografados
-- Estratégia: Adicionar estrutura SEM QUEBRAR sistema atual
-- Data: 2025-01-28
-- ============================================================================

-- ============================================================================
-- PARTE 0: Habilitar Extensões Necessárias
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configurar search_path para incluir vault e public
SET search_path TO public, vault;

-- ============================================================================
-- PARTE 1: Configuração do Vault
-- ============================================================================

-- Nota: O schema 'vault' e a extensão 'supabase_vault' já vêm pré-instalados
-- no Supabase Cloud, então não precisamos criá-los

-- 1.1: Função para criar secret e retornar ID
CREATE OR REPLACE FUNCTION create_client_secret(
  secret_value TEXT,
  secret_name TEXT,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Criar secret usando a função nativa do Supabase Vault
  SELECT vault.create_secret(secret_value, secret_name, secret_description) INTO secret_id;

  RETURN secret_id;
END;
$$;

-- 1.3: Função para ler secret descriptografado
CREATE OR REPLACE FUNCTION get_client_secret(secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$$;

-- 1.4: Função para atualizar secret
CREATE OR REPLACE FUNCTION update_client_secret(
  secret_id UUID,
  new_secret_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Usar função nativa do Vault (mantém name e description existentes como NULL)
  PERFORM vault.update_secret(secret_id, new_secret_value, NULL, NULL);

  RETURN TRUE;
END;
$$;

-- 1.5: Testar Vault (criar e deletar secret de teste)
DO $$
DECLARE
  test_secret_id UUID;
BEGIN
  -- Criar secret de teste
  test_secret_id := create_client_secret('test-value-123', 'test-secret', 'Migration test');

  -- Verificar se consegue ler
  IF get_client_secret(test_secret_id) != 'test-value-123' THEN
    RAISE EXCEPTION 'Vault test failed: cannot read secret';
  END IF;

  -- Limpar
  DELETE FROM vault.secrets WHERE id = test_secret_id;

  RAISE NOTICE '✅ Vault is working correctly!';
END $$;

-- ============================================================================
-- PARTE 2: Criar Tabela `clients`
-- ============================================================================

-- 2.1: Função helper para updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.2: Dropar tabela clients se já existir (para recriar com estrutura correta)
-- ATENÇÃO: Isso vai apagar dados existentes! Se tiver dados importantes, comente esta linha.
DROP TABLE IF EXISTS clients CASCADE;

-- 2.3: Criar tabela clients
CREATE TABLE clients (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'free',

  -- 🔐 Credenciais Meta (WhatsApp) - IDs do Vault
  meta_access_token_secret_id UUID NOT NULL,
  meta_verify_token_secret_id UUID NOT NULL,
  meta_phone_number_id TEXT NOT NULL,
  meta_display_phone TEXT,

  -- 🔐 Credenciais OpenAI - ID do Vault (opcional)
  openai_api_key_secret_id UUID,
  openai_model TEXT DEFAULT 'gpt-4o',

  -- 🔐 Credenciais Groq - ID do Vault (opcional)
  groq_api_key_secret_id UUID,
  groq_model TEXT DEFAULT 'llama-3.3-70b-versatile',

  -- Prompts Customizados
  system_prompt TEXT NOT NULL,
  formatter_prompt TEXT,

  -- Configurações de Comportamento
  settings JSONB DEFAULT '{
    "batching_delay_seconds": 10,
    "max_tokens": 2000,
    "temperature": 0.7,
    "enable_rag": true,
    "enable_tools": true,
    "enable_human_handoff": true,
    "message_split_enabled": true,
    "max_chat_history": 15
  }'::jsonb,

  -- Notificações
  notification_email TEXT,
  notification_webhook_url TEXT,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  -- 🎯 AI Provider Selection (added after initial deployment)
  primary_model_provider TEXT DEFAULT 'groq' NOT NULL,

  -- 🔐 Meta App Secret (SECURITY: HMAC signature validation - VULN-012 fix)
  meta_app_secret_secret_id UUID,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  CONSTRAINT valid_plan CHECK (plan IN ('free', 'pro', 'enterprise')),
  CONSTRAINT clients_primary_model_provider_check CHECK (primary_model_provider IN ('openai', 'groq'))
);

-- 2.4: Comments nas colunas
COMMENT ON COLUMN clients.primary_model_provider IS
'AI provider usado para conversação principal. openai=GPT-4o (caro, inteligente), groq=Llama (rápido, econômico)';

COMMENT ON COLUMN clients.meta_app_secret_secret_id IS
'Reference to Vault secret containing Meta App Secret (used for HMAC signature validation).
DIFFERENT from meta_verify_token_secret_id (used for webhook verification).';

-- 2.5: Índices
CREATE UNIQUE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_status ON clients(status) WHERE status = 'active';

-- 2.6: Trigger para updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2.7: View para facilitar leitura de secrets (apenas service role)
CREATE OR REPLACE VIEW client_secrets_decrypted AS
SELECT
  c.id as client_id,
  c.name,
  c.slug,
  c.status,
  get_client_secret(c.meta_access_token_secret_id) as meta_access_token,
  get_client_secret(c.meta_verify_token_secret_id) as meta_verify_token,
  c.meta_phone_number_id,
  CASE
    WHEN c.openai_api_key_secret_id IS NOT NULL
    THEN get_client_secret(c.openai_api_key_secret_id)
    ELSE NULL
  END as openai_api_key,
  CASE
    WHEN c.groq_api_key_secret_id IS NOT NULL
    THEN get_client_secret(c.groq_api_key_secret_id)
    ELSE NULL
  END as groq_api_key,
  c.system_prompt,
  c.formatter_prompt,
  c.settings,
  c.notification_email
FROM clients c
WHERE c.status = 'active';

COMMENT ON VIEW client_secrets_decrypted IS 'View with decrypted secrets - USE ONLY WITH SERVICE ROLE';

-- ============================================================================
-- PARTE 3: Adicionar `client_id` nas Tabelas Existentes (NULLABLE)
-- ============================================================================

-- 3.1: clientes_whatsapp (já pode existir como clientes_whatsapp ou "Clientes WhatsApp")
-- Tentamos adicionar a coluna de forma segura
DO $$
BEGIN
  -- Adicionar coluna client_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes_whatsapp'
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE clientes_whatsapp ADD COLUMN client_id UUID;
    RAISE NOTICE '✅ Added client_id to clientes_whatsapp';
  ELSE
    RAISE NOTICE '⏭️  client_id already exists in clientes_whatsapp';
  END IF;
END $$;

-- 3.2: n8n_chat_histories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'n8n_chat_histories'
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE n8n_chat_histories ADD COLUMN client_id UUID;
    RAISE NOTICE '✅ Added client_id to n8n_chat_histories';
  ELSE
    RAISE NOTICE '⏭️  client_id already exists in n8n_chat_histories';
  END IF;
END $$;

-- 3.3: documents (RAG)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents'
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN client_id UUID;
    RAISE NOTICE '✅ Added client_id to documents';
  ELSE
    RAISE NOTICE '⏭️  client_id already exists in documents';
  END IF;
END $$;

-- ============================================================================
-- PARTE 4: Índices Compostos (Preparação)
-- ============================================================================

-- 4.1: clientes_whatsapp - índice composto
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_client_phone
  ON clientes_whatsapp(client_id, telefone);

-- 4.2: n8n_chat_histories - índice composto
CREATE INDEX IF NOT EXISTS idx_chat_histories_client_session_created
  ON n8n_chat_histories(client_id, session_id, created_at DESC);

-- 4.3: documents - índice por cliente
CREATE INDEX IF NOT EXISTS idx_documents_client
  ON documents(client_id);

-- ============================================================================
-- PARTE 5: Atualizar RPC match_documents (RAG com client_id)
-- ============================================================================

-- 5.1: Nova versão da função match_documents com filtro de cliente
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INT,
  filter_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE (filter_client_id IS NULL OR documents.client_id = filter_client_id)
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- PARTE 6: Avisos Finais
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION 005 COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Run setup-default-client.sql to create default client';
  RAISE NOTICE '2. Migrate data: UPDATE tables SET client_id = default_client_id';
  RAISE NOTICE '3. Make client_id NOT NULL after migration';
  RAISE NOTICE '4. Test that system still works!';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Vault Functions Available:';
  RAISE NOTICE '  - create_client_secret(value, name, description)';
  RAISE NOTICE '  - get_client_secret(secret_id)';
  RAISE NOTICE '  - update_client_secret(secret_id, new_value)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Modified:';
  RAISE NOTICE '  - clients (NEW)';
  RAISE NOTICE '  - clientes_whatsapp (client_id added)';
  RAISE NOTICE '  - n8n_chat_histories (client_id added)';
  RAISE NOTICE '  - documents (client_id added)';
  RAISE NOTICE '';
END $$;
