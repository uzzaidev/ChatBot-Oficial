-- =====================================================
-- MIGRATION: Budget Plan Templates (Modular Configuration)
-- =====================================================
-- Creates a modular system for budget configuration:
-- 1. budget_plan_templates - Define limits per plan type (free, basic, pro, enterprise)
-- 2. client_budget_limits - Per-client tracking based on their plan
--
-- Admins can adjust plan limits via Supabase Dashboard without code changes!
-- =====================================================

-- =====================================================
-- 1. BUDGET PLAN TEMPLATES (Modular Config)
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT UNIQUE NOT NULL, -- 'free', 'basic', 'pro', 'enterprise'
  display_name TEXT NOT NULL, -- 'Free Plan', 'Basic Plan', etc.
  total_budget_brl DECIMAL(10,2), -- NULL = unlimited

  -- Per-API limits (NULL = unlimited)
  chat_tokens_limit INTEGER,
  whisper_minutes_limit INTEGER,
  vision_images_limit INTEGER,
  embeddings_requests_limit INTEGER,

  -- Behavior flags
  pause_at_limit BOOLEAN DEFAULT false, -- Auto-pause when limit reached
  send_warning_at_percent INTEGER DEFAULT 80, -- Alert at 80% usage

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast plan lookups
CREATE INDEX IF NOT EXISTS idx_budget_plan_templates_plan_name
ON budget_plan_templates(plan_name);

-- Seed initial plan templates
INSERT INTO budget_plan_templates (
  plan_name,
  display_name,
  total_budget_brl,
  chat_tokens_limit,
  whisper_minutes_limit,
  vision_images_limit,
  embeddings_requests_limit,
  pause_at_limit,
  send_warning_at_percent
) VALUES
  -- Free Plan: Low limits, auto-pause
  (
    'free',
    'Free Plan',
    20.00,
    50000,    -- 50k tokens (~25 conversations)
    30,       -- 30 min audio
    20,       -- 20 images
    500,      -- 500 embedding requests
    true,     -- Auto-pause at limit
    80        -- Warn at 80%
  ),

  -- Basic Plan: Moderate limits
  (
    'basic',
    'Basic Plan',
    100.00,
    500000,   -- 500k tokens
    200,      -- 200 min audio
    100,      -- 100 images
    5000,     -- 5k embedding requests
    true,
    90
  ),

  -- Pro Plan: High limits
  (
    'pro',
    'Pro Plan',
    500.00,
    2000000,  -- 2M tokens
    1000,     -- 1000 min audio
    500,      -- 500 images
    20000,    -- 20k embedding requests
    false,    -- No auto-pause (just warn)
    85
  ),

  -- Enterprise Plan: Unlimited
  (
    'enterprise',
    'Enterprise Plan',
    NULL,     -- Unlimited budget
    NULL,     -- Unlimited tokens
    NULL,     -- Unlimited audio
    NULL,     -- Unlimited images
    NULL,     -- Unlimited embeddings
    false,
    NULL
  )
ON CONFLICT (plan_name) DO NOTHING; -- Idempotent

-- =====================================================
-- 2. CLIENT BUDGET LIMITS (Per-Client Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS client_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL REFERENCES budget_plan_templates(plan_name),

  -- Total budget tracking
  total_budget_brl DECIMAL(10,2), -- Copied from template (NULL = unlimited)
  current_usage_brl DECIMAL(10,2) DEFAULT 0.00,
  usage_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_budget_brl IS NULL OR total_budget_brl = 0 THEN 0
      ELSE (current_usage_brl / total_budget_brl * 100)
    END
  ) STORED,

  -- Per-API usage tracking
  chat_tokens_limit INTEGER,
  chat_tokens_used INTEGER DEFAULT 0,

  whisper_minutes_limit INTEGER,
  whisper_minutes_used INTEGER DEFAULT 0,

  vision_images_limit INTEGER,
  vision_images_used INTEGER DEFAULT 0,

  embeddings_requests_limit INTEGER,
  embeddings_requests_used INTEGER DEFAULT 0,

  -- Status flags
  is_paused BOOLEAN DEFAULT false,
  paused_reason TEXT,
  last_warning_sent_at TIMESTAMPTZ,

  -- Period tracking (monthly reset)
  period_start_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
  period_end_date TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id) -- One budget limit per client
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_budget_limits_client_id
ON client_budget_limits(client_id);

CREATE INDEX IF NOT EXISTS idx_client_budget_limits_plan_name
ON client_budget_limits(plan_name);

CREATE INDEX IF NOT EXISTS idx_client_budget_limits_is_paused
ON client_budget_limits(is_paused)
WHERE is_paused = true; -- Partial index for active pauses only

-- =====================================================
-- 3. FUNCTIONS: Initialize Budget for New Client
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_client_budget(
  p_client_id UUID,
  p_plan_name TEXT DEFAULT 'free'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template budget_plan_templates%ROWTYPE;
  v_budget_id UUID;
BEGIN
  -- Get plan template
  SELECT * INTO v_template
  FROM budget_plan_templates
  WHERE plan_name = p_plan_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan template not found: %', p_plan_name;
  END IF;

  -- Insert or update client budget limits
  INSERT INTO client_budget_limits (
    client_id,
    plan_name,
    total_budget_brl,
    chat_tokens_limit,
    whisper_minutes_limit,
    vision_images_limit,
    embeddings_requests_limit
  ) VALUES (
    p_client_id,
    v_template.plan_name,
    v_template.total_budget_brl,
    v_template.chat_tokens_limit,
    v_template.whisper_minutes_limit,
    v_template.vision_images_limit,
    v_template.embeddings_requests_limit
  )
  ON CONFLICT (client_id) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    total_budget_brl = EXCLUDED.total_budget_brl,
    chat_tokens_limit = EXCLUDED.chat_tokens_limit,
    whisper_minutes_limit = EXCLUDED.whisper_minutes_limit,
    vision_images_limit = EXCLUDED.vision_images_limit,
    embeddings_requests_limit = EXCLUDED.embeddings_requests_limit,
    updated_at = NOW()
  RETURNING id INTO v_budget_id;

  RETURN v_budget_id;
END;
$$;

-- =====================================================
-- 4. FUNCTIONS: Increment Budget Usage
-- =====================================================

CREATE OR REPLACE FUNCTION increment_budget_usage(
  p_client_id UUID,
  p_api_type TEXT,
  p_cost_brl DECIMAL DEFAULT 0,
  p_tokens INTEGER DEFAULT 0,
  p_minutes INTEGER DEFAULT 0,
  p_images INTEGER DEFAULT 0,
  p_requests INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget client_budget_limits%ROWTYPE;
  v_should_pause BOOLEAN := false;
  v_template budget_plan_templates%ROWTYPE;
BEGIN
  -- Get current budget
  SELECT * INTO v_budget
  FROM client_budget_limits
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    -- Auto-initialize with free plan if not exists
    PERFORM initialize_client_budget(p_client_id, 'free');
    SELECT * INTO v_budget FROM client_budget_limits WHERE client_id = p_client_id;
  END IF;

  -- Get template for pause behavior
  SELECT * INTO v_template
  FROM budget_plan_templates
  WHERE plan_name = v_budget.plan_name;

  -- Increment total cost
  UPDATE client_budget_limits
  SET current_usage_brl = current_usage_brl + p_cost_brl,
      updated_at = NOW()
  WHERE client_id = p_client_id;

  -- Increment per-API usage
  CASE p_api_type
    WHEN 'chat' THEN
      UPDATE client_budget_limits
      SET chat_tokens_used = chat_tokens_used + p_tokens
      WHERE client_id = p_client_id;

      -- Check if limit exceeded
      IF v_budget.chat_tokens_limit IS NOT NULL AND
         (v_budget.chat_tokens_used + p_tokens) >= v_budget.chat_tokens_limit THEN
        v_should_pause := v_template.pause_at_limit;
      END IF;

    WHEN 'whisper' THEN
      UPDATE client_budget_limits
      SET whisper_minutes_used = whisper_minutes_used + p_minutes
      WHERE client_id = p_client_id;

      IF v_budget.whisper_minutes_limit IS NOT NULL AND
         (v_budget.whisper_minutes_used + p_minutes) >= v_budget.whisper_minutes_limit THEN
        v_should_pause := v_template.pause_at_limit;
      END IF;

    WHEN 'vision' THEN
      UPDATE client_budget_limits
      SET vision_images_used = vision_images_used + p_images
      WHERE client_id = p_client_id;

      IF v_budget.vision_images_limit IS NOT NULL AND
         (v_budget.vision_images_used + p_images) >= v_budget.vision_images_limit THEN
        v_should_pause := v_template.pause_at_limit;
      END IF;

    WHEN 'embeddings' THEN
      UPDATE client_budget_limits
      SET embeddings_requests_used = embeddings_requests_used + p_requests
      WHERE client_id = p_client_id;

      IF v_budget.embeddings_requests_limit IS NOT NULL AND
         (v_budget.embeddings_requests_used + p_requests) >= v_budget.embeddings_requests_limit THEN
        v_should_pause := v_template.pause_at_limit;
      END IF;
  END CASE;

  -- Auto-pause if needed
  IF v_should_pause THEN
    UPDATE client_budget_limits
    SET is_paused = true,
        paused_reason = format('Limit exceeded for %s API', p_api_type),
        updated_at = NOW()
    WHERE client_id = p_client_id;
  END IF;

  -- Check total budget limit
  IF v_budget.total_budget_brl IS NOT NULL AND
     (v_budget.current_usage_brl + p_cost_brl) >= v_budget.total_budget_brl AND
     v_template.pause_at_limit THEN
    UPDATE client_budget_limits
    SET is_paused = true,
        paused_reason = 'Total budget limit exceeded',
        updated_at = NOW()
    WHERE client_id = p_client_id;
  END IF;

  RETURN v_should_pause;
END;
$$;

-- =====================================================
-- 5. FUNCTIONS: Reset Monthly Budget
-- =====================================================

CREATE OR REPLACE FUNCTION reset_monthly_budgets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_count INTEGER := 0;
BEGIN
  -- Reset all budgets where period ended
  UPDATE client_budget_limits
  SET
    current_usage_brl = 0,
    chat_tokens_used = 0,
    whisper_minutes_used = 0,
    vision_images_used = 0,
    embeddings_requests_used = 0,
    is_paused = false,
    paused_reason = NULL,
    period_start_date = DATE_TRUNC('month', NOW()),
    period_end_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    updated_at = NOW()
  WHERE period_end_date <= NOW();

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  RETURN v_reset_count;
END;
$$;

-- =====================================================
-- 6. FUNCTIONS: Check if Client Budget Available
-- =====================================================

CREATE OR REPLACE FUNCTION check_budget_available(
  p_client_id UUID,
  p_api_type TEXT DEFAULT 'chat'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget client_budget_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_budget
  FROM client_budget_limits
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    -- No budget configured = allow (will be initialized on first use)
    RETURN true;
  END IF;

  -- Check if paused
  IF v_budget.is_paused THEN
    RETURN false;
  END IF;

  -- Check per-API limits
  CASE p_api_type
    WHEN 'chat' THEN
      IF v_budget.chat_tokens_limit IS NOT NULL AND
         v_budget.chat_tokens_used >= v_budget.chat_tokens_limit THEN
        RETURN false;
      END IF;

    WHEN 'whisper' THEN
      IF v_budget.whisper_minutes_limit IS NOT NULL AND
         v_budget.whisper_minutes_used >= v_budget.whisper_minutes_limit THEN
        RETURN false;
      END IF;

    WHEN 'vision' THEN
      IF v_budget.vision_images_limit IS NOT NULL AND
         v_budget.vision_images_used >= v_budget.vision_images_limit THEN
        RETURN false;
      END IF;

    WHEN 'embeddings' THEN
      IF v_budget.embeddings_requests_limit IS NOT NULL AND
         v_budget.embeddings_requests_used >= v_budget.embeddings_requests_limit THEN
        RETURN false;
      END IF;
  END CASE;

  -- Check total budget
  IF v_budget.total_budget_brl IS NOT NULL AND
     v_budget.current_usage_brl >= v_budget.total_budget_brl THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- =====================================================
-- 7. TRIGGER: Auto-update timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_budget_plan_templates_timestamp
  BEFORE UPDATE ON budget_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

CREATE TRIGGER trigger_update_client_budget_limits_timestamp
  BEFORE UPDATE ON client_budget_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE budget_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_budget_limits ENABLE ROW LEVEL SECURITY;

-- Admins can view all plan templates
CREATE POLICY "Admins can view plan templates"
  ON budget_plan_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can modify plan templates
CREATE POLICY "Admins can modify plan templates"
  ON budget_plan_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can view their own client budget
CREATE POLICY "Users can view own client budget"
  ON client_budget_limits
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE clients.id IN (
        SELECT client_id FROM user_profiles
        WHERE user_profiles.id = auth.uid()
      )
    )
  );

-- Admins can view all client budgets
CREATE POLICY "Admins can view all client budgets"
  ON client_budget_limits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can modify all client budgets
CREATE POLICY "Admins can modify all client budgets"
  ON client_budget_limits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE budget_plan_templates IS 'Modular budget configuration templates per plan type (free, basic, pro, enterprise). Edit these to change plan limits without code changes.';
COMMENT ON TABLE client_budget_limits IS 'Per-client budget tracking based on their assigned plan. Automatically initialized on first API usage.';
COMMENT ON FUNCTION initialize_client_budget IS 'Initialize or update client budget based on plan template';
COMMENT ON FUNCTION increment_budget_usage IS 'Increment usage counters and auto-pause if limits exceeded';
COMMENT ON FUNCTION reset_monthly_budgets IS 'Reset all client budgets at start of new billing period (run via cron)';
COMMENT ON FUNCTION check_budget_available IS 'Check if client has budget available for API call (call before processing)';
