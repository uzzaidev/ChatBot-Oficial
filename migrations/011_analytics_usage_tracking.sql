-- =====================================================
-- Analytics & Usage Tracking Enhancement
-- =====================================================
-- This migration enhances the usage_logs table to support
-- detailed analytics for the /dashboard/analytics page
-- 
-- Features:
-- - Track tokens per conversation
-- - Store OpenAI/Groq usage separately
-- - Track prompt/completion tokens individually
-- - Store model information
-- - Enable cost calculation per conversation
--
-- Run in Supabase SQL Editor
-- =====================================================

-- Drop existing table if it exists to recreate with new schema
DROP TABLE IF EXISTS usage_logs CASCADE;

-- Create enhanced usage_logs table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant & conversation tracking
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  
  -- API provider tracking
  source TEXT NOT NULL CHECK (source IN ('openai', 'groq', 'whisper', 'meta')),
  model TEXT, -- e.g., 'gpt-4', 'llama-3.1-70b'
  
  -- Token usage (detailed breakdown)
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Cost tracking (USD)
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  
  -- Legacy fields (for backward compatibility)
  messages_sent INTEGER DEFAULT 0,
  
  -- Additional metadata (processing time, etc.)
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX idx_usage_logs_client_id ON usage_logs(client_id);
CREATE INDEX idx_usage_logs_conversation_id ON usage_logs(conversation_id);
CREATE INDEX idx_usage_logs_phone ON usage_logs(phone);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_source ON usage_logs(source);
CREATE INDEX idx_usage_logs_model ON usage_logs(model);

-- Composite index for common analytics queries
CREATE INDEX idx_usage_logs_client_date_source ON usage_logs(client_id, created_at DESC, source);

-- Enable RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can access all
CREATE POLICY "Service role can access all usage logs" ON usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Function: Get daily usage statistics
CREATE OR REPLACE FUNCTION get_daily_usage(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  source TEXT,
  total_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ul.created_at) as date,
    ul.source,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(ul.created_at), ul.source
  ORDER BY date DESC, source;
END;
$$ LANGUAGE plpgsql;

-- Function: Get usage by conversation
CREATE OR REPLACE FUNCTION get_usage_by_conversation(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  phone TEXT,
  conversation_name TEXT,
  total_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT,
  openai_tokens BIGINT,
  groq_tokens BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.phone,
    COALESCE(cw.nome, 'Sem nome') as conversation_name,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count,
    SUM(CASE WHEN ul.source = 'openai' THEN ul.total_tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN ul.source = 'groq' THEN ul.total_tokens ELSE 0 END)::BIGINT as groq_tokens
  FROM usage_logs ul
  LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.telefone::TEXT AND cw.client_id = p_client_id
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.phone, cw.nome
  ORDER BY total_tokens DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get monthly summary by provider
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_client_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM NOW())::INTEGER
)
RETURNS TABLE (
  source TEXT,
  model TEXT,
  total_tokens BIGINT,
  prompt_tokens BIGINT,
  completion_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    COALESCE(ul.model, 'unknown') as model,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.prompt_tokens)::BIGINT as prompt_tokens,
    SUM(ul.completion_tokens)::BIGINT as completion_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND EXTRACT(YEAR FROM ul.created_at) = p_year
    AND EXTRACT(MONTH FROM ul.created_at) = p_month
  GROUP BY ul.source, ul.model
  ORDER BY total_tokens DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get weekly evolution (last 12 weeks)
CREATE OR REPLACE FUNCTION get_weekly_evolution(
  p_client_id UUID,
  p_weeks INTEGER DEFAULT 12
)
RETURNS TABLE (
  week_start DATE,
  week_number INTEGER,
  total_tokens BIGINT,
  openai_tokens BIGINT,
  groq_tokens BIGINT,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH weeks AS (
    SELECT 
      DATE_TRUNC('week', ul.created_at)::DATE as week_start,
      EXTRACT(WEEK FROM ul.created_at)::INTEGER as week_number,
      ul.source,
      SUM(ul.total_tokens) as tokens,
      SUM(ul.cost_usd) as cost
    FROM usage_logs ul
    WHERE ul.client_id = p_client_id
      AND ul.created_at >= DATE_TRUNC('week', NOW()) - ((p_weeks - 1) || ' weeks')::INTERVAL
    GROUP BY DATE_TRUNC('week', ul.created_at), EXTRACT(WEEK FROM ul.created_at), ul.source
  )
  SELECT
    w.week_start,
    w.week_number,
    SUM(w.tokens)::BIGINT as total_tokens,
    SUM(CASE WHEN w.source = 'openai' THEN w.tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN w.source = 'groq' THEN w.tokens ELSE 0 END)::BIGINT as groq_tokens,
    SUM(w.cost)::NUMERIC as total_cost
  FROM weeks w
  GROUP BY w.week_start, w.week_number
  ORDER BY w.week_start ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This migration enhances usage tracking for analytics
-- 2. Old usage_logs data will be lost (backup first if needed)
-- 3. Helper functions provide pre-aggregated data for dashboard
-- 4. Cost calculation must be done in application code before insertion
-- 5. Conversation_id can be NULL for non-conversation requests (e.g., webhook validation)
