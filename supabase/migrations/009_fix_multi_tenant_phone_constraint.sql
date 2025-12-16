-- ============================================================================
-- MIGRATION 009: FIX MULTI-TENANT PHONE NUMBER CONSTRAINT (CRITICAL SECURITY)
-- ============================================================================
-- Data: 2025-11-30
-- Autor: Sistema
-- Prioridade: 🔴 CRÍTICA - SECURITY BUG
--
-- PROBLEMA:
-- A tabela clientes_whatsapp tem constraint UNIQUE(telefone), permitindo apenas
-- UM registro por número de telefone GLOBALMENTE.
--
-- Isso causa FALHA DE ISOLAMENTO MULTI-TENANT:
-- - Se Cliente A e Cliente B testam com o mesmo número (+5511999999999)
-- - O UPSERT sobrescreve o registro do Cliente A com dados do Cliente B
-- - Histórico de chat vaza entre clientes
-- - Status (bot/humano) é compartilhado incorretamente
--
-- SOLUÇÃO:
-- Mudar constraint para UNIQUE(telefone, client_id), permitindo o mesmo número
-- em clientes diferentes (isolamento correto).
--
-- IMPACTO:
-- ✅ Zero downtime (DDL não bloqueia reads/writes em Postgres 12+)
-- ✅ Não afeta dados existentes
-- ✅ Melhora segurança multi-tenant
-- ============================================================================

-- Step 1: Remover constraint antiga (UNIQUE telefone)
-- NOTA: Usa IF EXISTS para ser idempotente
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_telefone_key'
  ) THEN
    ALTER TABLE clientes_whatsapp 
    DROP CONSTRAINT clientes_whatsapp_telefone_key;
    
    RAISE NOTICE '✅ Removed old UNIQUE(telefone) constraint';
  ELSE
    RAISE NOTICE 'ℹ️  Old constraint already removed';
  END IF;
END $$;

-- Step 2: Adicionar nova constraint UNIQUE(telefone, client_id)
-- Isso permite o mesmo telefone em clientes diferentes (correto!)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_telefone_client_id_key'
  ) THEN
    ALTER TABLE clientes_whatsapp 
    ADD CONSTRAINT clientes_whatsapp_telefone_client_id_key 
    UNIQUE (telefone, client_id);
    
    RAISE NOTICE '✅ Added new UNIQUE(telefone, client_id) constraint';
  ELSE
    RAISE NOTICE 'ℹ️  New constraint already exists';
  END IF;
END $$;

-- Step 3: Criar índice composto para performance
-- Isso acelera queries que filtram por telefone + client_id
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_telefone_client_id 
ON clientes_whatsapp(telefone, client_id);

-- Step 4: Atualizar estatísticas para query planner
ANALYZE clientes_whatsapp;

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================================================

-- Verificar constraints
DO $$
DECLARE
  old_constraint_exists BOOLEAN;
  new_constraint_exists BOOLEAN;
BEGIN
  -- Check old constraint (should NOT exist)
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_telefone_key'
  ) INTO old_constraint_exists;
  
  -- Check new constraint (should exist)
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_telefone_client_id_key'
  ) INTO new_constraint_exists;
  
  IF old_constraint_exists THEN
    RAISE EXCEPTION '❌ MIGRATION FAILED: Old constraint still exists!';
  END IF;
  
  IF NOT new_constraint_exists THEN
    RAISE EXCEPTION '❌ MIGRATION FAILED: New constraint not created!';
  END IF;
  
  RAISE NOTICE '✅ MIGRATION SUCCESSFUL!';
  RAISE NOTICE '   - Old UNIQUE(telefone) constraint removed';
  RAISE NOTICE '   - New UNIQUE(telefone, client_id) constraint created';
  RAISE NOTICE '   - Multi-tenant isolation now correct';
END $$;

-- ============================================================================
-- TESTE MANUAL (OPCIONAL)
-- ============================================================================
-- Após executar esta migration, teste:
--
-- 1. Inserir mesmo telefone em 2 clientes diferentes (deve funcionar):
--    INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
--    VALUES ('+5511999999999', 'Teste A', 'bot', 'client-id-a');
--
--    INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
--    VALUES ('+5511999999999', 'Teste B', 'bot', 'client-id-b');
--
-- 2. Inserir mesmo telefone no MESMO cliente (deve FALHAR - correto!):
--    INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
--    VALUES ('+5511999999999', 'Teste C', 'bot', 'client-id-a');
--    -- ERROR: duplicate key value violates unique constraint
--
-- 3. Verificar UPSERT funciona corretamente:
--    INSERT INTO clientes_whatsapp (telefone, nome, status, client_id)
--    VALUES ('+5511999999999', 'Nome Atualizado', 'bot', 'client-id-a')
--    ON CONFLICT (telefone, client_id) DO UPDATE SET nome = EXCLUDED.nome;
--
-- ============================================================================
-- ROLLBACK (SE NECESSÁRIO)
-- ============================================================================
-- ATENÇÃO: Só execute se realmente precisar reverter!
--
-- -- Remover nova constraint
-- ALTER TABLE clientes_whatsapp 
-- DROP CONSTRAINT IF EXISTS clientes_whatsapp_telefone_client_id_key;
--
-- -- Restaurar constraint antiga (⚠️ pode falhar se houver duplicatas!)
-- ALTER TABLE clientes_whatsapp 
-- ADD CONSTRAINT clientes_whatsapp_telefone_key UNIQUE (telefone);
--
-- ============================================================================

-- Comentário final da migration
COMMENT ON CONSTRAINT clientes_whatsapp_telefone_client_id_key ON clientes_whatsapp IS 
'Multi-tenant isolation: Same phone number can exist in different clients. 
Migration 009 - Fixed critical security bug where UPSERT was overwriting data across clients.';
