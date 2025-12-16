-- =====================================================
-- Performance Optimization Migration
-- =====================================================
-- This migration adds indexes to optimize query performance
-- for the chatbot workflow after migrating from n8n
--
-- Date: 2025-10-27
-- Purpose: Improve database query performance for fast chatbot responses
-- =====================================================

-- Index on n8n_chat_histories.session_id for faster lookups
-- This is used heavily in getChatHistory and conversation queries
CREATE INDEX IF NOT EXISTS idx_chat_histories_session_id 
ON n8n_chat_histories(session_id);

-- Index on n8n_chat_histories.created_at for faster sorting
-- Used for getting latest messages and chat history ordering
CREATE INDEX IF NOT EXISTS idx_chat_histories_created_at 
ON n8n_chat_histories(created_at DESC);

-- Composite index for session_id + created_at (covers most queries)
-- Optimizes the common pattern: WHERE session_id = X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_chat_histories_session_created 
ON n8n_chat_histories(session_id, created_at DESC);

-- Index on "Clientes WhatsApp".telefone for faster customer lookups
-- Used in checkOrCreateCustomer and conversations endpoint
CREATE INDEX IF NOT EXISTS idx_clientes_telefone 
ON "Clientes WhatsApp"(telefone);

-- Index on "Clientes WhatsApp".status for filtering
-- Used when filtering conversations by status (bot/human)
CREATE INDEX IF NOT EXISTS idx_clientes_status 
ON "Clientes WhatsApp"(status);

-- Add UNIQUE constraint on telefone if it doesn't exist
-- Required for UPSERT (ON CONFLICT) to work in checkOrCreateCustomer
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clientes_whatsapp_telefone_key'
  ) THEN
    ALTER TABLE "Clientes WhatsApp" 
    ADD CONSTRAINT clientes_whatsapp_telefone_key UNIQUE (telefone);
  END IF;
END $$;

-- Analyze tables to update statistics for query planner
ANALYZE n8n_chat_histories;
ANALYZE "Clientes WhatsApp";

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run this migration in Supabase SQL Editor
-- 2. These indexes will improve performance of:
--    - /api/conversations endpoint (N+1 query fix)
--    - checkOrCreateCustomer node (UPSERT optimization)
--    - getChatHistory node (faster history retrieval)
-- 3. Indexes are created with IF NOT EXISTS to be idempotent
-- 4. Expected performance improvement: 50-80% faster queries
-- =====================================================
