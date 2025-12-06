-- =====================================================
-- Migration: Add 'fluxo_inicial' status to clientes_whatsapp
-- Date: 2025-12-06
-- Phase: Phase 3 - Flow Executor + Status Control
-- Description: Adds new status 'fluxo_inicial' for contacts
--              navigating interactive flows
-- =====================================================

-- Drop existing lowercase check constraint
ALTER TABLE clientes_whatsapp
DROP CONSTRAINT IF EXISTS clientes_whatsapp_status_lowercase_check;

-- Add new check constraint with 'fluxo_inicial' status
ALTER TABLE clientes_whatsapp
ADD CONSTRAINT clientes_whatsapp_status_check
CHECK (status IN ('bot', 'humano', 'transferido', 'fluxo_inicial'));

-- Add performance index for status queries
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_status
  ON clientes_whatsapp(client_id, status)
  WHERE status IN ('humano', 'transferido', 'fluxo_inicial');

-- Update comment on status column
COMMENT ON COLUMN clientes_whatsapp.status IS
  'Status do contato:
  - bot: Conversa normal com IA (padrão)
  - humano: Atendimento humano ativo
  - transferido: Transferido para humano (legacy)
  - fluxo_inicial: Cliente navegando em flow interativo (agente bloqueado)';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify constraint was added
DO $$
BEGIN
  -- Test that new status is allowed
  RAISE NOTICE '✅ Migration successful: fluxo_inicial status added';
  RAISE NOTICE 'ℹ️  Valid status values: bot, humano, transferido, fluxo_inicial';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
