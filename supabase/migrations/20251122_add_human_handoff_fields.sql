-- Migration: Add human handoff tracking fields
-- Created: 2025-11-22
-- Description: Adds transferred_at and transferred_by fields to track manual human handoff

-- Add transferred_at column (timestamp when conversation was transferred to human)
ALTER TABLE clientes_whatsapp
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

-- Add transferred_by column (user who transferred the conversation)
ALTER TABLE clientes_whatsapp
ADD COLUMN IF NOT EXISTS transferred_by UUID REFERENCES auth.users(id);

-- Add comments for documentation
COMMENT ON COLUMN clientes_whatsapp.transferred_at
IS 'Timestamp da última transferência para atendimento humano';

COMMENT ON COLUMN clientes_whatsapp.transferred_by
IS 'ID do usuário (auth.users) que transferiu a conversa para atendimento humano';

-- Create index for faster queries filtering by transferred conversations
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_transferred_at
ON clientes_whatsapp(transferred_at)
WHERE transferred_at IS NOT NULL;

-- Create index for queries by user who transferred
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_transferred_by
ON clientes_whatsapp(transferred_by)
WHERE transferred_by IS NOT NULL;
