-- Migration: Add message status tracking for WhatsApp delivery status
-- Description: Adds status column to track message delivery (pending, sent, delivered, read, failed)
-- Author: System
-- Date: 2026-01-04

-- Add status column to track WhatsApp message delivery status
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed'));

-- Add error_details column to store error information when status = 'failed'
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Add updated_at column to track when status was last updated
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on wamid for faster status lookups
CREATE INDEX IF NOT EXISTS idx_chat_histories_wamid ON n8n_chat_histories(wamid) WHERE wamid IS NOT NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_chat_histories_status ON n8n_chat_histories(status);

-- Create index on updated_at for realtime queries
CREATE INDEX IF NOT EXISTS idx_chat_histories_updated_at ON n8n_chat_histories(updated_at DESC);

-- Comment on columns
COMMENT ON COLUMN n8n_chat_histories.status IS 'WhatsApp message delivery status: pending (initial), sent (received by WhatsApp), delivered (received by user device), read (read by user), failed (delivery error)';
COMMENT ON COLUMN n8n_chat_histories.error_details IS 'JSON object containing error information when status = failed (code, title, message, error_data)';
COMMENT ON COLUMN n8n_chat_histories.updated_at IS 'Timestamp when status was last updated (used for realtime tracking)';
