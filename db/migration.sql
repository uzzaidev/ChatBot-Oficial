-- =====================================================
-- WhatsApp SaaS Chatbot - Database Migration
-- =====================================================
-- This file creates tables needed for Phase 2 Dashboard
-- Some tables already exist (created by n8n workflow)
-- New tables are marked with [NEW]

-- =====================================================
-- EXISTING TABLES (DO NOT CREATE - ALREADY IN USE BY N8N)
-- =====================================================
-- 1. "Clientes WhatsApp" - Customer records (phone, name, status)
-- 2. "n8n_chat_histories" - Conversation memory storage
-- 3. "documents" - Vector store for RAG knowledge base

-- =====================================================
-- NEW TABLES FOR PHASE 2 DASHBOARD
-- =====================================================

-- [NEW] Multi-tenant client configuration
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  verify_token TEXT NOT NULL,
  meta_access_token TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  openai_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [NEW] Structured conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot', 'waiting', 'human')),
  assigned_to TEXT,
  last_message TEXT,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, phone)
);

-- [NEW] Individual messages table (alternative to n8n_chat_histories)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image', 'document', 'video')),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'queued')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- [NEW] Usage tracking for billing and metrics
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('openai', 'meta', 'groq', 'whisper')),
  tokens_used INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_update ON conversations(last_update DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_client_id ON usage_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_source ON usage_logs(source);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Clients: Only service role can access (dashboard backend)
CREATE POLICY "Service role can access all clients" ON clients
  FOR ALL USING (auth.role() = 'service_role');

-- Conversations: Service role can access all
CREATE POLICY "Service role can access all conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

-- Messages: Service role can access all
CREATE POLICY "Service role can access all messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Usage logs: Service role can access all
CREATE POLICY "Service role can access all usage logs" ON usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clients table
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get conversation summary for dashboard
CREATE OR REPLACE FUNCTION get_conversation_summary(p_client_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  conversation_id UUID,
  phone TEXT,
  name TEXT,
  status TEXT,
  last_message TEXT,
  last_update TIMESTAMPTZ,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.phone,
    c.name,
    c.status,
    c.last_message,
    c.last_update,
    COUNT(m.id) as message_count
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.client_id = p_client_id
  GROUP BY c.id, c.phone, c.name, c.status, c.last_message, c.last_update
  ORDER BY c.last_update DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate usage costs
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_client_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  source TEXT,
  total_tokens BIGINT,
  total_messages BIGINT,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    SUM(ul.tokens_used) as total_tokens,
    SUM(ul.messages_sent) as total_messages,
    SUM(ul.cost_usd) as total_cost
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY ul.source;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA (OPTIONAL - FOR DEVELOPMENT)
-- =====================================================

-- Insert a demo client for testing
-- UNCOMMENT THE LINES BELOW TO CREATE A DEMO CLIENT
-- INSERT INTO clients (name, verify_token, meta_access_token, phone_number_id)
-- VALUES (
--   'Demo Client',
--   'demo_verify_token_123',
--   'demo_meta_access_token',
--   '899639703222013'
-- );

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This migration assumes you're running PostgreSQL 14+
-- 2. Run this file using: psql -U postgres -d your_db -f migration.sql
-- 3. Or execute via Supabase SQL Editor
-- 4. Existing tables (Clientes WhatsApp, n8n_chat_histories, documents)
--    remain unchanged and continue to work with n8n workflow
-- 5. Phase 2 Dashboard will read from both old and new tables
-- 6. For production, add proper encryption for sensitive fields
--    (meta_access_token, openai_api_key)
