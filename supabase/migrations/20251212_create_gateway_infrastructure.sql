-- =====================================================
-- AI GATEWAY INFRASTRUCTURE
-- =====================================================
-- Description: Creates core tables for Vercel AI Gateway integration
-- Date: 2025-12-12
-- Phase: 1 - Database Schema
-- =====================================================

-- =====================================================
-- 1. GATEWAY CONFIGURATIONS (Multi-tenant config)
-- =====================================================
CREATE TABLE IF NOT EXISTS gateway_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Gateway Key ÚNICA POR CLIENTE (criada na SUA conta Vercel)
  gateway_api_key_secret_id UUID REFERENCES vault.secrets(id),
  gateway_key_name TEXT, -- Nome da key no Vercel (ex: "client-acme-corp")

  -- Configuration
  use_gateway BOOLEAN DEFAULT false,
  cache_enabled BOOLEAN DEFAULT true,
  cache_ttl_seconds INTEGER DEFAULT 3600,

  -- Fallback chains: array of model identifiers
  -- Example: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022", "groq/llama-3.3-70b-versatile"]
  fallback_chains JSONB DEFAULT '[]'::jsonb,

  -- Provider preferences: custom config per provider
  -- Example: {"openai": {"temperature": 0.7}, "anthropic": {"max_tokens": 4000}}
  provider_preferences JSONB DEFAULT '{}'::jsonb,

  -- Rate limits
  max_requests_per_minute INTEGER DEFAULT 100,
  max_tokens_per_minute INTEGER DEFAULT 50000,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id)
);

-- Indexes
CREATE INDEX idx_gateway_configurations_client_id ON gateway_configurations(client_id);
CREATE INDEX idx_gateway_configurations_use_gateway ON gateway_configurations(use_gateway) WHERE use_gateway = true;

-- Updated trigger
CREATE OR REPLACE FUNCTION update_gateway_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gateway_configurations_updated_at
  BEFORE UPDATE ON gateway_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_gateway_configurations_updated_at();

-- RLS Policies
ALTER TABLE gateway_configurations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage gateway configurations"
  ON gateway_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Clients can view their own configuration
CREATE POLICY "Clients can view own gateway configuration"
  ON gateway_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = gateway_configurations.client_id
    )
  );

-- =====================================================
-- 2. AI MODELS REGISTRY (Catálogo de modelos)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_models_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'groq', 'google'
  model_name TEXT NOT NULL, -- 'gpt-4o', 'claude-3-5-sonnet-20241022', etc.
  gateway_identifier TEXT NOT NULL UNIQUE, -- 'openai/gpt-4o' (usado na chamada do gateway)

  -- Capabilities (JSONB)
  -- Example: {"text": true, "vision": true, "tools": true, "streaming": true}
  capabilities JSONB NOT NULL,

  -- Context limits
  context_window INTEGER, -- Ex: 128000 tokens
  max_output_tokens INTEGER, -- Ex: 16384 tokens

  -- Pricing (USD per million tokens)
  input_price_per_million NUMERIC(10, 6) NOT NULL,
  output_price_per_million NUMERIC(10, 6) NOT NULL,
  cached_input_price_per_million NUMERIC(10, 6), -- Para modelos com cache (ex: Anthropic)

  -- Status
  is_active BOOLEAN DEFAULT true,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider, model_name)
);

-- Indexes
CREATE INDEX idx_ai_models_registry_provider ON ai_models_registry(provider);
CREATE INDEX idx_ai_models_registry_is_active ON ai_models_registry(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_models_registry_gateway_identifier ON ai_models_registry(gateway_identifier);

-- Updated trigger
CREATE TRIGGER ai_models_registry_updated_at
  BEFORE UPDATE ON ai_models_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_gateway_configurations_updated_at();

-- RLS Policies (Public read)
ALTER TABLE ai_models_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active models"
  ON ai_models_registry
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage models registry"
  ON ai_models_registry
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. GATEWAY USAGE LOGS (Logs de uso com métricas)
-- =====================================================
CREATE TABLE IF NOT EXISTS gateway_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,

  -- Request metadata
  request_id TEXT, -- ID do request no gateway
  model_registry_id UUID REFERENCES ai_models_registry(id),
  provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
  model_name TEXT NOT NULL, -- 'gpt-4o', 'claude-3-5-sonnet', etc.

  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER DEFAULT 0, -- Tokens servidos do cache
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Performance metrics
  latency_ms INTEGER, -- Tempo de resposta em milissegundos

  -- Cache & Fallback
  was_cached BOOLEAN DEFAULT false, -- Request foi servido do cache?
  was_fallback BOOLEAN DEFAULT false, -- Usou modelo de fallback?
  fallback_reason TEXT, -- Motivo do fallback (se aplicável)

  -- Cost tracking
  cost_usd NUMERIC(12, 8), -- Custo em USD (calculado com base em pricing)
  cost_brl NUMERIC(12, 2), -- Custo em BRL (convertido)
  usd_to_brl_rate NUMERIC(8, 4), -- Taxa de câmbio usada

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb, -- Metadados extras
  error_details JSONB, -- Detalhes de erros (se houver)

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gateway_usage_logs_client_id ON gateway_usage_logs(client_id);
CREATE INDEX idx_gateway_usage_logs_conversation_id ON gateway_usage_logs(conversation_id);
CREATE INDEX idx_gateway_usage_logs_created_at ON gateway_usage_logs(created_at DESC);
CREATE INDEX idx_gateway_usage_logs_provider ON gateway_usage_logs(provider);
CREATE INDEX idx_gateway_usage_logs_model_name ON gateway_usage_logs(model_name);
CREATE INDEX idx_gateway_usage_logs_was_cached ON gateway_usage_logs(was_cached);
CREATE INDEX idx_gateway_usage_logs_was_fallback ON gateway_usage_logs(was_fallback);

-- RLS Policies
ALTER TABLE gateway_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage logs"
  ON gateway_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view own usage logs"
  ON gateway_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = gateway_usage_logs.client_id
    )
  );

CREATE POLICY "System can insert usage logs"
  ON gateway_usage_logs
  FOR INSERT
  WITH CHECK (true); -- Service role can always insert

-- =====================================================
-- 4. GATEWAY CACHE PERFORMANCE (Métricas agregadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS gateway_cache_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Time bucket (hourly aggregation)
  date DATE NOT NULL,
  hour INTEGER, -- 0-23 (NULL = agregação diária)

  -- Cache metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  cache_hit_rate NUMERIC(5, 2), -- Percentual (0-100)

  -- Savings
  tokens_saved INTEGER NOT NULL DEFAULT 0, -- Tokens economizados pelo cache
  cost_saved_usd NUMERIC(10, 4), -- Economia em USD
  cost_saved_brl NUMERIC(10, 2), -- Economia em BRL

  -- Latency comparison
  avg_latency_cached_ms INTEGER, -- Latência média de requests com cache
  avg_latency_uncached_ms INTEGER, -- Latência média sem cache
  latency_improvement_pct NUMERIC(5, 2), -- Melhoria percentual (0-100)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, date, hour)
);

-- Indexes
CREATE INDEX idx_gateway_cache_performance_client_id ON gateway_cache_performance(client_id);
CREATE INDEX idx_gateway_cache_performance_date ON gateway_cache_performance(date DESC);
CREATE INDEX idx_gateway_cache_performance_client_date ON gateway_cache_performance(client_id, date DESC);

-- Updated trigger
CREATE TRIGGER gateway_cache_performance_updated_at
  BEFORE UPDATE ON gateway_cache_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_gateway_configurations_updated_at();

-- RLS Policies
ALTER TABLE gateway_cache_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cache performance"
  ON gateway_cache_performance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view own cache performance"
  ON gateway_cache_performance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = gateway_cache_performance.client_id
    )
  );

CREATE POLICY "System can manage cache performance"
  ON gateway_cache_performance
  FOR ALL
  WITH CHECK (true); -- Service role can insert/update

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE gateway_configurations IS 'Multi-tenant configuration for Vercel AI Gateway - each client has their own gateway key';
COMMENT ON TABLE ai_models_registry IS 'Catalog of available AI models with pricing and capabilities';
COMMENT ON TABLE gateway_usage_logs IS 'Detailed logs of AI requests with token usage, cost, and performance metrics';
COMMENT ON TABLE gateway_cache_performance IS 'Aggregated cache performance metrics by hour/day';

COMMENT ON COLUMN gateway_configurations.gateway_api_key_secret_id IS 'Reference to encrypted gateway key in Supabase Vault (one per client)';
COMMENT ON COLUMN gateway_configurations.fallback_chains IS 'Array of model identifiers for automatic fallback on failure';
COMMENT ON COLUMN ai_models_registry.gateway_identifier IS 'Full identifier used in Vercel AI SDK (e.g., "openai/gpt-4o")';
COMMENT ON COLUMN gateway_usage_logs.was_cached IS 'Whether this request was served from gateway cache';
COMMENT ON COLUMN gateway_usage_logs.cost_usd IS 'Actual cost charged by the provider in USD';
COMMENT ON COLUMN gateway_cache_performance.cache_hit_rate IS 'Percentage of requests served from cache (0-100)';
