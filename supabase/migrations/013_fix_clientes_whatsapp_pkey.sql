-- ============================================================================
-- MIGRATION 013: FIX PRIMARY KEY FOR MULTI-TENANT SUPPORT
-- ============================================================================
-- Data: 2025-12-01
-- Autor: Sistema
-- Prioridade: 🔴 CRÍTICA - Complementa migration 009
--
-- PROBLEMA:
-- A migration 009 adicionou UNIQUE(telefone, client_id), mas a PRIMARY KEY
-- ainda é apenas (telefone), causando erro em UPSERT:
--   "duplicate key value violates unique constraint clientes_whatsapp_pkey"
--
-- Quando o mesmo telefone já existe para outro client_id, o INSERT falha
-- porque a PK ainda é UNIQUE(telefone).
--
-- SOLUÇÃO:
-- 1. Adicionar coluna 'id' UUID como nova chave primária
-- 2. Remover antiga PK de 'telefone'
-- 3. Manter UNIQUE(telefone, client_id) para lógica de upsert
--
-- ALTERNATIVA (mais simples, menos invasiva):
-- Mudar a PK para (telefone, client_id) - composite primary key
-- Escolhemos essa alternativa por ser menos arriscada.
-- ============================================================================

-- Step 1: Remover PRIMARY KEY existente (telefone)
-- NOTA: Isso irá dropar a constraint clientes_whatsapp_pkey
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_pkey'
    AND conrelid = 'clientes_whatsapp'::regclass
  ) THEN
    ALTER TABLE clientes_whatsapp 
    DROP CONSTRAINT clientes_whatsapp_pkey;
    
    RAISE NOTICE '✅ Removed old PRIMARY KEY (telefone)';
  ELSE
    RAISE NOTICE 'ℹ️  Old PRIMARY KEY already removed';
  END IF;
END $$;

-- Step 2: Adicionar nova PRIMARY KEY composta (telefone, client_id)
-- Isso substitui a necessidade da constraint UNIQUE(telefone, client_id)
DO $$ 
BEGIN
  -- Primeiro, remover a constraint UNIQUE se existir (será substituída pela PK)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_telefone_client_id_key'
    AND conrelid = 'clientes_whatsapp'::regclass
  ) THEN
    ALTER TABLE clientes_whatsapp 
    DROP CONSTRAINT clientes_whatsapp_telefone_client_id_key;
    
    RAISE NOTICE '✅ Removed UNIQUE(telefone, client_id) - will be replaced by PK';
  END IF;

  -- Adicionar nova PRIMARY KEY composta
  ALTER TABLE clientes_whatsapp 
  ADD CONSTRAINT clientes_whatsapp_pkey 
  PRIMARY KEY (telefone, client_id);
  
  RAISE NOTICE '✅ Added new PRIMARY KEY (telefone, client_id)';
END $$;

-- Step 3: Garantir que o índice de performance ainda existe
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_telefone_client_id 
ON clientes_whatsapp(telefone, client_id);

-- Step 4: Atualizar estatísticas
ANALYZE clientes_whatsapp;

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================================================
DO $$
DECLARE
  pk_columns TEXT;
BEGIN
  -- Verificar que a PK agora é (telefone, client_id)
  SELECT string_agg(a.attname, ', ' ORDER BY array_position(i.indkey, a.attnum))
  INTO pk_columns
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  WHERE i.indrelid = 'clientes_whatsapp'::regclass
    AND i.indisprimary;

  IF pk_columns = 'telefone, client_id' THEN
    RAISE NOTICE '✅ MIGRATION SUCCESSFUL!';
    RAISE NOTICE '   - PRIMARY KEY is now (telefone, client_id)';
    RAISE NOTICE '   - UPSERT with onConflict="telefone,client_id" will work correctly';
  ELSE
    RAISE EXCEPTION '❌ MIGRATION FAILED: PK is "%" instead of "telefone, client_id"', pk_columns;
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (SE NECESSÁRIO - USE COM CUIDADO!)
-- ============================================================================
-- ATENÇÃO: Reverter pode causar perda de dados se houver duplicatas de telefone!
--
-- -- Remover nova PK
-- ALTER TABLE clientes_whatsapp DROP CONSTRAINT clientes_whatsapp_pkey;
--
-- -- Restaurar PK antiga (⚠️ FALHARÁ se houver telefones duplicados!)
-- ALTER TABLE clientes_whatsapp ADD PRIMARY KEY (telefone);
--
-- -- Restaurar UNIQUE constraint
-- ALTER TABLE clientes_whatsapp 
--   ADD CONSTRAINT clientes_whatsapp_telefone_client_id_key 
--   UNIQUE (telefone, client_id);
-- ============================================================================

COMMENT ON CONSTRAINT clientes_whatsapp_pkey ON clientes_whatsapp IS 
'Multi-tenant composite primary key: Allows same phone in different clients.
Migration 013 - Fixed UPSERT error caused by old single-column PK.';
