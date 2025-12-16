-- ============================================================================
-- MIGRATION: Add updated_at column to clientes_whatsapp
-- ============================================================================
-- Data: 2025-12-02
-- Objetivo: Adicionar coluna updated_at para rastrear atualizações de contatos
-- ============================================================================

-- Step 1: Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes_whatsapp' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE clientes_whatsapp 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Atualizar registros existentes para ter updated_at = created_at
    UPDATE clientes_whatsapp 
    SET updated_at = COALESCE(created_at, NOW()) 
    WHERE updated_at IS NULL;
    
    RAISE NOTICE '✅ Added updated_at column to clientes_whatsapp';
  ELSE
    RAISE NOTICE 'ℹ️  updated_at column already exists';
  END IF;
END $$;

-- Step 2: Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_clientes_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clientes_whatsapp_updated_at ON clientes_whatsapp;

CREATE TRIGGER trigger_update_clientes_whatsapp_updated_at
  BEFORE UPDATE ON clientes_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION update_clientes_whatsapp_updated_at();

-- Step 3: Criar índice para ordenação por updated_at
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_updated_at 
ON clientes_whatsapp(updated_at DESC);

RAISE NOTICE '✅ Migration completed: clientes_whatsapp now has updated_at column';
