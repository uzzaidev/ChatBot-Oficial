-- =====================================================
-- OpenAI Billing & Usage Sync Tables
-- =====================================================
--
-- Purpose: Sync official OpenAI usage data to compare with our internal tracking
-- This helps detect discrepancies and ensure accurate billing
--

-- =====================================================
-- 1. OpenAI Daily Usage Sync
-- =====================================================
CREATE TABLE IF NOT EXISTS openai_usage_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- OpenAI data
  aggregation_timestamp BIGINT NOT NULL, -- Unix timestamp
  usage_date DATE NOT NULL, -- For easier querying
  operation TEXT NOT NULL, -- "completion", "chat", "embeddings", etc.
  model_name TEXT NOT NULL, -- e.g., "gpt-4o-2024-08-06"

  -- Usage metrics
  n_requests INTEGER NOT NULL DEFAULT 0,
  n_context_tokens_total INTEGER NOT NULL DEFAULT 0, -- Input tokens
  n_generated_tokens_total INTEGER NOT NULL DEFAULT 0, -- Output tokens

  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate syncs
  UNIQUE(client_id, usage_date, model_name, operation)
);

-- Indexes for performance
CREATE INDEX idx_openai_usage_sync_client_date ON openai_usage_sync(client_id, usage_date DESC);
CREATE INDEX idx_openai_usage_sync_model ON openai_usage_sync(model_name);
CREATE INDEX idx_openai_usage_sync_operation ON openai_usage_sync(operation);

-- RLS Policies
ALTER TABLE openai_usage_sync ENABLE ROW LEVEL SECURITY;

-- Users can only see their own client's data
CREATE POLICY "Users can view their client's OpenAI sync data"
  ON openai_usage_sync
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Only service role can insert/update
CREATE POLICY "Service role can manage OpenAI sync data"
  ON openai_usage_sync
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 2. OpenAI Subscription Sync (limits, payment method)
-- =====================================================
CREATE TABLE IF NOT EXISTS openai_subscription_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Subscription details
  has_payment_method BOOLEAN NOT NULL DEFAULT false,
  is_canceled BOOLEAN NOT NULL DEFAULT false,
  hard_limit_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  soft_limit_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per client (upsert on sync)
  UNIQUE(client_id)
);

-- Index
CREATE INDEX idx_openai_subscription_sync_client ON openai_subscription_sync(client_id);

-- RLS Policies
ALTER TABLE openai_subscription_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client's subscription data"
  ON openai_subscription_sync
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage subscription data"
  ON openai_subscription_sync
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 3. OpenAI Daily Costs Sync (billing breakdown)
-- =====================================================
CREATE TABLE IF NOT EXISTS openai_daily_costs_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Cost details
  cost_date DATE NOT NULL,
  model_name TEXT NOT NULL,
  cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,

  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate syncs
  UNIQUE(client_id, cost_date, model_name)
);

-- Indexes
CREATE INDEX idx_openai_daily_costs_client_date ON openai_daily_costs_sync(client_id, cost_date DESC);
CREATE INDEX idx_openai_daily_costs_model ON openai_daily_costs_sync(model_name);

-- RLS Policies
ALTER TABLE openai_daily_costs_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client's daily costs"
  ON openai_daily_costs_sync
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage daily costs data"
  ON openai_daily_costs_sync
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 4. Discrepancy Detection View
-- =====================================================
-- Compare our tracking vs OpenAI's official numbers
CREATE OR REPLACE VIEW openai_tracking_discrepancies AS
SELECT
  ous.client_id,
  ous.usage_date,
  ous.model_name,

  -- OpenAI official numbers
  ous.n_requests AS openai_requests,
  ous.n_context_tokens_total AS openai_input_tokens,
  ous.n_generated_tokens_total AS openai_output_tokens,

  -- Our tracking numbers
  COALESCE(SUM(gul.input_tokens), 0) AS our_input_tokens,
  COALESCE(SUM(gul.output_tokens), 0) AS our_output_tokens,

  -- Discrepancies (%)
  CASE
    WHEN ous.n_context_tokens_total > 0 THEN
      ROUND((ABS(COALESCE(SUM(gul.input_tokens), 0) - ous.n_context_tokens_total)::NUMERIC / ous.n_context_tokens_total * 100), 2)
    ELSE 0
  END AS input_token_discrepancy_pct,

  CASE
    WHEN ous.n_generated_tokens_total > 0 THEN
      ROUND((ABS(COALESCE(SUM(gul.output_tokens), 0) - ous.n_generated_tokens_total)::NUMERIC / ous.n_generated_tokens_total * 100), 2)
    ELSE 0
  END AS output_token_discrepancy_pct

FROM openai_usage_sync ous
LEFT JOIN gateway_usage_logs gul
  ON gul.client_id = ous.client_id
  AND DATE(gul.created_at) = ous.usage_date
  AND gul.model_name = ous.model_name
GROUP BY
  ous.client_id,
  ous.usage_date,
  ous.model_name,
  ous.n_requests,
  ous.n_context_tokens_total,
  ous.n_generated_tokens_total
HAVING
  -- Only show significant discrepancies (>5%)
  (CASE
    WHEN ous.n_context_tokens_total > 0 THEN
      (ABS(COALESCE(SUM(gul.input_tokens), 0) - ous.n_context_tokens_total)::NUMERIC / ous.n_context_tokens_total * 100)
    ELSE 0
  END) > 5
  OR
  (CASE
    WHEN ous.n_generated_tokens_total > 0 THEN
      (ABS(COALESCE(SUM(gul.output_tokens), 0) - ous.n_generated_tokens_total)::NUMERIC / ous.n_generated_tokens_total * 100)
    ELSE 0
  END) > 5;

COMMENT ON TABLE openai_usage_sync IS 'Synced daily usage data from OpenAI API for reconciliation';
COMMENT ON TABLE openai_subscription_sync IS 'Synced subscription limits and payment info from OpenAI';
COMMENT ON TABLE openai_daily_costs_sync IS 'Synced daily cost breakdown from OpenAI billing API';
COMMENT ON VIEW openai_tracking_discrepancies IS 'Detects discrepancies between our tracking and OpenAI official numbers';
