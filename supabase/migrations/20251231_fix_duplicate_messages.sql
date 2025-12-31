-- ===================================================================
-- Migration: Fix Duplicate Messages in n8n_chat_histories
-- ===================================================================
-- Purpose: Prevent duplicate message inserts that cause frontend duplication
-- Date: 2025-12-31
--
-- PROBLEMA:
-- - Mensagens duplicadas aparecem no frontend (mesma mensagem com IDs diferentes)
-- - Causa: saveChatMessage() chamado 2x no chatbotFlow.ts (linhas 211 e 596)
--
-- SOLUÇÃO:
-- 1. Adicionar PRIMARY KEY explícito (id)
-- 2. Limpar duplicatas existentes ANTES de aplicar constraint
-- 3. Adicionar UNIQUE constraint em (client_id, wamid)
-- 4. Criar índice para performance
-- ===================================================================

-- ===================================================================
-- STEP 1: Add PRIMARY KEY (if not exists)
-- ===================================================================

DO $$
BEGIN
  -- Verificar se PRIMARY KEY já existe
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'n8n_chat_histories'::regclass
    AND contype = 'p'
  ) THEN
    -- Adicionar PRIMARY KEY
    ALTER TABLE n8n_chat_histories
    ADD PRIMARY KEY (id);

    RAISE NOTICE '✅ PRIMARY KEY adicionado em n8n_chat_histories(id)';
  ELSE
    RAISE NOTICE 'ℹ️  PRIMARY KEY já existe em n8n_chat_histories(id)';
  END IF;
END $$;

-- ===================================================================
-- STEP 2: Clean existing duplicates (keep most recent)
-- ===================================================================

-- Identificar e remover duplicatas (manter o registro mais RECENTE)
-- Critério: Mesmo client_id + wamid (WhatsApp message ID)

WITH duplicates AS (
  SELECT
    id,
    client_id,
    wamid,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, wamid
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM n8n_chat_histories
  WHERE wamid IS NOT NULL  -- Somente mensagens com wamid (evita remover histórico legado)
)
DELETE FROM n8n_chat_histories
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE rn > 1  -- Remove duplicatas (mantém primeira = rn=1)
);

-- Log de mensagens removidas
DO $$
DECLARE
  deleted_count INT;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Removidas % mensagens duplicadas', deleted_count;
END $$;

-- ===================================================================
-- STEP 3: Add UNIQUE constraint
-- ===================================================================

-- UNIQUE constraint em (client_id, wamid)
-- Previne duplicatas futuras de mensagens do WhatsApp

DO $$
BEGIN
  -- Verificar se constraint já existe
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'n8n_chat_histories'::regclass
    AND conname = 'n8n_chat_histories_client_wamid_unique'
  ) THEN
    -- Adicionar UNIQUE constraint
    ALTER TABLE n8n_chat_histories
    ADD CONSTRAINT n8n_chat_histories_client_wamid_unique
    UNIQUE (client_id, wamid);

    RAISE NOTICE '✅ UNIQUE constraint adicionado: (client_id, wamid)';
  ELSE
    RAISE NOTICE 'ℹ️  UNIQUE constraint já existe: (client_id, wamid)';
  END IF;
END $$;

-- ===================================================================
-- STEP 4: Create index for performance
-- ===================================================================

-- Índice parcial: somente registros com wamid (mensagens do WhatsApp)
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_wamid_lookup
ON n8n_chat_histories(wamid)
WHERE wamid IS NOT NULL;

-- ===================================================================
-- STEP 5: Verification
-- ===================================================================

DO $$
DECLARE
  has_pk BOOLEAN;
  has_unique BOOLEAN;
  has_index BOOLEAN;
  total_records INT;
  records_with_wamid INT;
  unique_wamids INT;
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO DE MIGRAÇÃO ===';

  -- Verificar PRIMARY KEY
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'n8n_chat_histories'::regclass AND contype = 'p'
  ) INTO has_pk;

  IF has_pk THEN
    RAISE NOTICE '✅ PRIMARY KEY: OK';
  ELSE
    RAISE WARNING '❌ PRIMARY KEY: MISSING';
  END IF;

  -- Verificar UNIQUE constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'n8n_chat_histories'::regclass
    AND conname = 'n8n_chat_histories_client_wamid_unique'
  ) INTO has_unique;

  IF has_unique THEN
    RAISE NOTICE '✅ UNIQUE constraint: OK';
  ELSE
    RAISE WARNING '❌ UNIQUE constraint: MISSING';
  END IF;

  -- Verificar índice
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'n8n_chat_histories'
    AND indexname = 'idx_n8n_chat_histories_wamid_lookup'
  ) INTO has_index;

  IF has_index THEN
    RAISE NOTICE '✅ Índice wamid: OK';
  ELSE
    RAISE WARNING '❌ Índice wamid: MISSING';
  END IF;

  -- Estatísticas
  SELECT COUNT(*) INTO total_records FROM n8n_chat_histories;
  SELECT COUNT(*) INTO records_with_wamid FROM n8n_chat_histories WHERE wamid IS NOT NULL;
  SELECT COUNT(DISTINCT wamid) INTO unique_wamids FROM n8n_chat_histories WHERE wamid IS NOT NULL;

  RAISE NOTICE '📊 Total de registros: %', total_records;
  RAISE NOTICE '📊 Registros com wamid: %', records_with_wamid;
  RAISE NOTICE '📊 WAMIDs únicos: %', unique_wamids;

  IF records_with_wamid > unique_wamids THEN
    RAISE WARNING '⚠️  AINDA EXISTEM DUPLICATAS! Diferença: %', records_with_wamid - unique_wamids;
  ELSE
    RAISE NOTICE '✅ Sem duplicatas detectadas';
  END IF;
END $$;

-- ===================================================================
-- ROLLBACK (se necessário)
-- ===================================================================
--
-- Para reverter esta migration:
--
-- -- Remover constraint e índices
-- ALTER TABLE n8n_chat_histories
--   DROP CONSTRAINT IF EXISTS n8n_chat_histories_client_wamid_unique;
--
-- DROP INDEX IF EXISTS idx_n8n_chat_histories_wamid_lookup;
--
-- -- Remover PRIMARY KEY (APENAS se não existia antes)
-- -- ALTER TABLE n8n_chat_histories DROP CONSTRAINT IF EXISTS n8n_chat_histories_pkey;
--
-- ===================================================================
