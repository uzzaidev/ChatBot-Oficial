-- =====================================================
-- AI GATEWAY BUDGET SYSTEM
-- =====================================================
-- Description: Creates budget management tables for AI Gateway
-- Date: 2025-12-12
-- Phase: 1 - Database Schema
-- =====================================================

-- =====================================================
-- 1. PLAN BUDGETS (Budget padrão por plano)
-- =====================================================
CREATE TABLE IF NOT EXISTS plan_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan identification
  plan_name TEXT NOT NULL UNIQUE, -- 'free', 'basic', 'pro', 'enterprise'

  -- Budget configuration
  budget_type TEXT NOT NULL CHECK (budget_type IN ('tokens', 'brl', 'usd')),
  budget_limit NUMERIC NOT NULL CHECK (budget_limit > 0),
  budget_period TEXT NOT NULL CHECK (budget_period IN ('daily', 'weekly', 'monthly')),

  -- Alert thresholds
  alert_threshold_80 BOOLEAN DEFAULT true,
  alert_threshold_90 BOOLEAN DEFAULT true,
  alert_threshold_100 BOOLEAN DEFAULT true,

  -- Actions on limit
  pause_at_limit BOOLEAN DEFAULT false, -- Pausar gateway ao atingir 100%?

  -- Notification settings
  notification_email TEXT, -- Email para receber alertas (admin)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plan_budgets_plan_name ON plan_budgets(plan_name);

-- Updated trigger
CREATE OR REPLACE FUNCTION update_plan_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plan_budgets_updated_at
  BEFORE UPDATE ON plan_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_budgets_updated_at();

-- RLS Policies
ALTER TABLE plan_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan budgets"
  ON plan_budgets
  FOR SELECT
  USING (true); -- Public read

CREATE POLICY "Admins can manage plan budgets"
  ON plan_budgets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- 2. CLIENT BUDGETS (Budget customizado por cliente)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client reference
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Budget configuration (overrides plan defaults)
  budget_type TEXT NOT NULL CHECK (budget_type IN ('tokens', 'brl', 'usd')),
  budget_limit NUMERIC NOT NULL CHECK (budget_limit > 0),
  budget_period TEXT NOT NULL CHECK (budget_period IN ('daily', 'weekly', 'monthly')),

  -- Current usage (reset periodically by cron job)
  current_usage NUMERIC DEFAULT 0 CHECK (current_usage >= 0),
  usage_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (usage_percentage >= 0 AND usage_percentage <= 100),

  -- Last reset tracking
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  next_reset_at TIMESTAMPTZ, -- Calculado com base no budget_period

  -- Alert thresholds
  alert_threshold_80 BOOLEAN DEFAULT true,
  alert_threshold_90 BOOLEAN DEFAULT true,
  alert_threshold_100 BOOLEAN DEFAULT true,

  -- Alert status tracking (evitar spam de alertas)
  alert_80_sent BOOLEAN DEFAULT false,
  alert_90_sent BOOLEAN DEFAULT false,
  alert_100_sent BOOLEAN DEFAULT false,

  -- Actions on limit
  pause_at_limit BOOLEAN DEFAULT false, -- Pausar gateway ao atingir 100%?
  is_paused BOOLEAN DEFAULT false, -- Status atual

  -- Notification settings
  notification_email TEXT, -- Email para receber alertas (cliente)

  -- Override flag
  inherits_from_plan BOOLEAN DEFAULT true, -- Se false, ignora configuração do plano

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id)
);

-- Indexes
CREATE INDEX idx_client_budgets_client_id ON client_budgets(client_id);
CREATE INDEX idx_client_budgets_is_paused ON client_budgets(is_paused) WHERE is_paused = true;
CREATE INDEX idx_client_budgets_usage_percentage ON client_budgets(usage_percentage);
CREATE INDEX idx_client_budgets_next_reset ON client_budgets(next_reset_at);

-- Updated trigger
CREATE TRIGGER client_budgets_updated_at
  BEFORE UPDATE ON client_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_budgets_updated_at();

-- Auto-calculate usage percentage trigger
CREATE OR REPLACE FUNCTION calculate_budget_usage_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.budget_limit > 0 THEN
    NEW.usage_percentage = ROUND((NEW.current_usage / NEW.budget_limit) * 100, 2);
  ELSE
    NEW.usage_percentage = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_budgets_calculate_percentage
  BEFORE INSERT OR UPDATE OF current_usage, budget_limit ON client_budgets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_budget_usage_percentage();

-- Auto-calculate next_reset_at trigger
CREATE OR REPLACE FUNCTION calculate_next_reset()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.budget_period
    WHEN 'daily' THEN
      NEW.next_reset_at = (NEW.last_reset_at + INTERVAL '1 day');
    WHEN 'weekly' THEN
      NEW.next_reset_at = (NEW.last_reset_at + INTERVAL '1 week');
    WHEN 'monthly' THEN
      NEW.next_reset_at = (NEW.last_reset_at + INTERVAL '1 month');
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_budgets_calculate_next_reset
  BEFORE INSERT OR UPDATE OF budget_period, last_reset_at ON client_budgets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_reset();

-- RLS Policies
ALTER TABLE client_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all client budgets"
  ON client_budgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view own budget"
  ON client_budgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = client_budgets.client_id
    )
  );

CREATE POLICY "Admins can manage all client budgets"
  ON client_budgets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can update client budgets"
  ON client_budgets
  FOR UPDATE
  USING (true); -- Service role can update usage

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment budget usage
CREATE OR REPLACE FUNCTION increment_budget_usage(
  p_client_id UUID,
  p_amount NUMERIC
)
RETURNS void AS $$
BEGIN
  UPDATE client_budgets
  SET current_usage = current_usage + p_amount
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset budget (called by cron)
CREATE OR REPLACE FUNCTION reset_budget_usage(
  p_client_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE client_budgets
  SET
    current_usage = 0,
    usage_percentage = 0,
    last_reset_at = NOW(),
    alert_80_sent = false,
    alert_90_sent = false,
    alert_100_sent = false,
    is_paused = false
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if budget limit is reached
CREATE OR REPLACE FUNCTION is_budget_exceeded(
  p_client_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_budget client_budgets%ROWTYPE;
BEGIN
  SELECT * INTO v_budget
  FROM client_budgets
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN false; -- No budget configured
  END IF;

  IF v_budget.is_paused THEN
    RETURN true; -- Already paused
  END IF;

  RETURN v_budget.current_usage >= v_budget.budget_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE plan_budgets IS 'Default budget configuration per subscription plan (free, basic, pro, enterprise)';
COMMENT ON TABLE client_budgets IS 'Per-client budget configuration and usage tracking - overrides plan defaults';

COMMENT ON COLUMN plan_budgets.budget_type IS 'Type of budget limit: tokens (count), brl (Brazilian Real), usd (US Dollar)';
COMMENT ON COLUMN plan_budgets.budget_period IS 'Reset period: daily, weekly, or monthly';
COMMENT ON COLUMN plan_budgets.pause_at_limit IS 'Automatically pause gateway access when 100% limit is reached';

COMMENT ON COLUMN client_budgets.current_usage IS 'Current usage in the period (tokens or currency amount)';
COMMENT ON COLUMN client_budgets.usage_percentage IS 'Auto-calculated percentage (0-100) of budget used';
COMMENT ON COLUMN client_budgets.last_reset_at IS 'When the budget was last reset to zero';
COMMENT ON COLUMN client_budgets.next_reset_at IS 'Auto-calculated next reset date based on period';
COMMENT ON COLUMN client_budgets.alert_80_sent IS 'Flag to prevent duplicate alerts at 80% threshold';
COMMENT ON COLUMN client_budgets.is_paused IS 'Whether gateway is currently paused due to budget limit';
COMMENT ON COLUMN client_budgets.inherits_from_plan IS 'If true, uses plan defaults; if false, uses custom config';

COMMENT ON FUNCTION increment_budget_usage IS 'Increments current_usage for a client (called after each AI request)';
COMMENT ON FUNCTION reset_budget_usage IS 'Resets budget to zero (called by cron job based on period)';
COMMENT ON FUNCTION is_budget_exceeded IS 'Checks if client has exceeded their budget limit';
