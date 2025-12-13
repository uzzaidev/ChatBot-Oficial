-- =====================================================
-- AI GATEWAY - MODIFY EXISTING TABLES
-- =====================================================
-- Description: Add AI Gateway related columns to existing tables
-- Date: 2025-12-12
-- Phase: 1 - Database Schema
-- =====================================================

-- =====================================================
-- 1. MODIFY CLIENTS TABLE
-- =====================================================
-- Add gateway feature flag to clients table
-- NOTE: Keys are SHARED (in shared_gateway_config), not per-client

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS use_ai_gateway BOOLEAN DEFAULT false;

-- Index for feature flag
CREATE INDEX IF NOT EXISTS idx_clients_use_ai_gateway ON clients(use_ai_gateway) WHERE use_ai_gateway = true;

-- Comments
COMMENT ON COLUMN clients.use_ai_gateway IS 'Enable AI Gateway for this client (feature flag per client)';

-- =====================================================
-- 2. MODIFY PRICING_CONFIG TABLE
-- =====================================================
-- Add gateway pricing columns to support AI Gateway pricing

ALTER TABLE pricing_config
  ADD COLUMN IF NOT EXISTS is_gateway_pricing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cached_input_price NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS price_per_million_tokens NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Index for gateway pricing
CREATE INDEX IF NOT EXISTS idx_pricing_config_is_gateway ON pricing_config(is_gateway_pricing) WHERE is_gateway_pricing = true;

-- Comments
COMMENT ON COLUMN pricing_config.is_gateway_pricing IS 'True if this pricing is for AI Gateway models (vs direct SDK pricing)';
COMMENT ON COLUMN pricing_config.cached_input_price IS 'Price per million cached input tokens (for models that support cache like Anthropic)';
COMMENT ON COLUMN pricing_config.price_per_million_tokens IS 'Unified price per million tokens (alternative pricing model)';
COMMENT ON COLUMN pricing_config.currency IS 'Currency for pricing (USD, BRL, EUR, etc.)';

-- =====================================================
-- UPDATE RLS POLICIES (if needed)
-- =====================================================
-- The existing RLS policies for clients and pricing_config should
-- automatically cover the new columns, but verify after migration

-- =====================================================
-- DATA MIGRATION NOTES
-- =====================================================
-- IMPORTANT:
-- 1. No automatic data migration needed - new columns are optional
-- 2. Existing clients will have use_ai_gateway = false by default
-- 3. Gateway configuration will be added manually per client via dashboard
-- 4. Pricing config can be populated via API or manually

-- =====================================================
-- VALIDATION QUERIES (Run after migration)
-- =====================================================
-- Verify new columns exist:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'clients' AND column_name IN ('use_ai_gateway', 'gateway_api_key_secret_id', 'gateway_key_name');

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'pricing_config' AND column_name IN ('is_gateway_pricing', 'cached_input_price', 'price_per_million_tokens', 'currency');
