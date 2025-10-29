-- =====================================================
-- Migration: Add client_id to n8n legacy tables
-- =====================================================
-- Purpose: Enable multi-tenant filtering for n8n tables
-- Date: 2025-10-29
-- 
-- SECURITY: This migration is CRITICAL for preventing cross-client data access
-- 
-- Tables affected:
-- 1. "Clientes WhatsApp" (or clientes_whatsapp if renamed)
-- 2. n8n_chat_histories
-- 3. documents (optional - for RAG)
-- 
-- IMPORTANT:
-- - Run this migration BEFORE enabling RLS (RLS.sql)
-- - Existing data will have client_id = NULL initially
-- - You must update existing records with correct client_id values
-- - After populating client_id, you can make it NOT NULL
-- =====================================================

-- =====================================================
-- 1. Add client_id to "Clientes WhatsApp" / clientes_whatsapp
-- =====================================================

DO $$
BEGIN
  -- Check if table exists (with or without quotes)
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Clientes WhatsApp') OR 
     EXISTS (SELECT FROM pg_tables WHERE tablename = 'clientes_whatsapp') THEN
    
    -- Try to add column to quoted table name first
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Clientes WhatsApp') THEN
      -- Check if column doesn't exist yet
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Clientes WhatsApp' 
        AND column_name = 'client_id'
      ) THEN
        ALTER TABLE "Clientes WhatsApp" 
        ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_client_id 
        ON "Clientes WhatsApp"(client_id);
        
        RAISE NOTICE '✅ Coluna client_id adicionada a "Clientes WhatsApp"';
      ELSE
        RAISE NOTICE 'ℹ️  Coluna client_id já existe em "Clientes WhatsApp"';
      END IF;
    END IF;
    
    -- Also handle renamed table (without quotes)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'clientes_whatsapp') THEN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clientes_whatsapp' 
        AND column_name = 'client_id'
      ) THEN
        ALTER TABLE clientes_whatsapp 
        ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_client_id 
        ON clientes_whatsapp(client_id);
        
        RAISE NOTICE '✅ Coluna client_id adicionada a clientes_whatsapp';
      ELSE
        RAISE NOTICE 'ℹ️  Coluna client_id já existe em clientes_whatsapp';
      END IF;
    END IF;
  ELSE
    RAISE WARNING '⚠️  Tabela Clientes WhatsApp não encontrada';
  END IF;
END $$;

-- =====================================================
-- 2. Add client_id to n8n_chat_histories
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'n8n_chat_histories') THEN
    
    -- Check if column doesn't exist yet
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'n8n_chat_histories' 
      AND column_name = 'client_id'
    ) THEN
      ALTER TABLE n8n_chat_histories 
      ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
      
      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_client_id 
      ON n8n_chat_histories(client_id);
      
      -- Create composite index for common query pattern
      CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_session_client 
      ON n8n_chat_histories(session_id, client_id);
      
      RAISE NOTICE '✅ Coluna client_id adicionada a n8n_chat_histories';
    ELSE
      RAISE NOTICE 'ℹ️  Coluna client_id já existe em n8n_chat_histories';
    END IF;
  ELSE
    RAISE WARNING '⚠️  Tabela n8n_chat_histories não encontrada';
  END IF;
END $$;

-- =====================================================
-- 3. Add client_id to documents (optional - for RAG)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'documents') THEN
    
    -- Check if column doesn't exist yet
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'client_id'
    ) THEN
      ALTER TABLE documents 
      ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_documents_client_id 
      ON documents(client_id);
      
      RAISE NOTICE '✅ Coluna client_id adicionada a documents';
    ELSE
      RAISE NOTICE 'ℹ️  Coluna client_id já existe em documents';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Tabela documents não encontrada (OK se não usar RAG)';
  END IF;
END $$;

-- =====================================================
-- 4. IMPORTANT: Populate client_id for existing data
-- =====================================================
-- 
-- AÇÃO NECESSÁRIA: Execute os comandos abaixo MANUALMENTE
-- substituindo 'YOUR_CLIENT_ID_HERE' pelo UUID real do cliente
-- 
-- Para encontrar o client_id correto:
-- SELECT id, name FROM clients;
-- 
-- Exemplo de uso (substitua o UUID):
-- UPDATE "Clientes WhatsApp" 
-- SET client_id = 'YOUR_CLIENT_ID_HERE'::UUID
-- WHERE client_id IS NULL;
-- 
-- UPDATE n8n_chat_histories 
-- SET client_id = 'YOUR_CLIENT_ID_HERE'::UUID
-- WHERE client_id IS NULL;
-- 
-- UPDATE documents 
-- SET client_id = 'YOUR_CLIENT_ID_HERE'::UUID
-- WHERE client_id IS NULL;
-- 
-- =====================================================

-- =====================================================
-- 5. Verification
-- =====================================================

DO $$
DECLARE
  clientes_has_client_id BOOLEAN;
  n8n_has_client_id BOOLEAN;
  docs_has_client_id BOOLEAN;
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO DE MIGRAÇÃO ===';
  
  -- Check Clientes WhatsApp
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name IN ('Clientes WhatsApp', 'clientes_whatsapp')
    AND column_name = 'client_id'
  ) INTO clientes_has_client_id;
  
  IF clientes_has_client_id THEN
    RAISE NOTICE '✅ Clientes WhatsApp: client_id existe';
  ELSE
    RAISE WARNING '❌ Clientes WhatsApp: client_id NÃO existe';
  END IF;
  
  -- Check n8n_chat_histories
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'n8n_chat_histories'
    AND column_name = 'client_id'
  ) INTO n8n_has_client_id;
  
  IF n8n_has_client_id THEN
    RAISE NOTICE '✅ n8n_chat_histories: client_id existe';
  ELSE
    RAISE WARNING '❌ n8n_chat_histories: client_id NÃO existe';
  END IF;
  
  -- Check documents
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'documents'
    AND column_name = 'client_id'
  ) INTO docs_has_client_id;
  
  IF docs_has_client_id THEN
    RAISE NOTICE '✅ documents: client_id existe';
  ELSE
    RAISE NOTICE 'ℹ️  documents: client_id NÃO existe (OK se não usar RAG)';
  END IF;
END $$;

-- =====================================================
-- NEXT STEPS
-- =====================================================
-- 
-- 1. ✅ Execute esta migration no Supabase SQL Editor
-- 
-- 2. 🔄 Popule client_id para dados existentes:
--    - Identifique qual client_id usar (DEFAULT_CLIENT_ID do .env)
--    - Execute UPDATEs conforme exemplo na seção 4 acima
--    - Verifique: SELECT COUNT(*) FROM n8n_chat_histories WHERE client_id IS NULL;
-- 
-- 3. 🔐 Habilite RLS:
--    - Execute migrations/RLS.sql
--    - Isso criará políticas de segurança para isolar dados por cliente
-- 
-- 4. ✅ Teste isolamento multi-tenant:
--    - Crie 2 usuários com client_ids diferentes
--    - Tente acessar dados de outro cliente (deve retornar vazio)
--    - Verifique logs do Supabase para queries bloqueadas por RLS
-- 
-- 5. 🚀 Deploy:
--    - Atualize código da aplicação (já feito nesta PR)
--    - Deploy do Next.js dashboard
--    - Teste em produção com dados reais
-- 
-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- 
-- ATENÇÃO: Para reverter esta migration (CUIDADO - perda de dados!)
-- 
-- O uso de CASCADE irá remover:
-- - Índices criados: idx_clientes_whatsapp_client_id, idx_n8n_chat_histories_client_id, etc.
-- - Políticas RLS que dependem da coluna client_id
-- - Constraints de foreign key
-- 
-- Certifique-se de fazer backup antes de executar:
-- 
-- -- Backup das tabelas
-- CREATE TABLE clientes_whatsapp_backup AS SELECT * FROM "Clientes WhatsApp";
-- CREATE TABLE n8n_chat_histories_backup AS SELECT * FROM n8n_chat_histories;
-- CREATE TABLE documents_backup AS SELECT * FROM documents;
-- 
-- -- Remover colunas (após backup)
-- ALTER TABLE "Clientes WhatsApp" DROP COLUMN IF EXISTS client_id CASCADE;
-- ALTER TABLE n8n_chat_histories DROP COLUMN IF EXISTS client_id CASCADE;
-- ALTER TABLE documents DROP COLUMN IF EXISTS client_id CASCADE;
-- 
-- Após rollback, você precisará:
-- 1. Re-executar RLS.sql (se foi aplicado antes)
-- 2. Recriar índices customizados
-- 
-- =====================================================
