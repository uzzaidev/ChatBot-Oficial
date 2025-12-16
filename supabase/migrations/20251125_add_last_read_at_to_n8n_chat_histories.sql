-- =====================================================
-- Migration: Add last_read_at to clientes_whatsapp table
-- =====================================================
-- Purpose: Track when user last read a conversation
-- Date: 2025-11-25
--
-- This enables persistent read/unread state across sessions
-- When last_read_at < last_message_time, conversation has unread messages
--
-- =====================================================

-- Add last_read_at column to clientes_whatsapp table
ALTER TABLE clientes_whatsapp
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- Create index for performance on read status queries
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_last_read_at
ON clientes_whatsapp(last_read_at);

-- Create compound index for efficient unread filtering
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_telefone_last_read
ON clientes_whatsapp(telefone, last_read_at);

-- =====================================================
-- Update existing conversations (optional)
-- =====================================================
-- For existing conversations, you can set last_read_at to NOW()
-- to mark them as read initially, or leave as NULL to mark as unread
--
-- UPDATE clientes_whatsapp SET last_read_at = NOW() WHERE last_read_at IS NULL;
--
-- =====================================================