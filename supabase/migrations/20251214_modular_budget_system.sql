-- =====================================================
-- MODULAR BUDGET SYSTEM
-- =====================================================
-- Description: Adds modular budget tracking (tokens, BRL, or BOTH)
-- Date: 2024-12-14
-- Features:
--   - Budget mode: 'tokens', 'brl', 'both' (hybrid)
--   - Track tokens AND BRL simultaneously
--   - Auto-pause when ANY limit is reached
--   - Unified tracking for ALL APIs (Gateway + TTS + Whisper + Vision + Embeddings)
-- =====================================================

-- =====================================================
-- 1. MODIFY client_budgets TABLE
-- =====================================================

-- Step 1: Remove NOT NULL constraints from old columns (if they exist)
ALTER TABLE client_budgets
ALTER COLUMN budget_type DROP NOT NULL,
ALTER COLUMN budget_limit DROP NOT NULL;

-- Step 2: Add new columns for modular budget
ALTER TABLE client_budgets
ADD COLUMN IF NOT EXISTS budget_mode TEXT DEFAULT 'brl' CHECK (budget_mode IN ('tokens', 'brl', 'both')),

-- Token tracking
ADD COLUMN IF NOT EXISTS token_limit BIGINT DEFAULT 0 CHECK (token_limit >= 0),
ADD COLUMN IF NOT EXISTS current_tokens BIGINT DEFAULT 0 CHECK (current_tokens >= 0),
ADD COLUMN IF NOT EXISTS token_usage_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (token_usage_percentage >= 0 AND token_usage_percentage <= 100),

-- BRL tracking
ADD COLUMN IF NOT EXISTS brl_limit NUMERIC(12, 2) DEFAULT 0 CHECK (brl_limit >= 0),
ADD COLUMN IF NOT EXISTS current_brl NUMERIC(12, 2) DEFAULT 0 CHECK (current_brl >= 0),
ADD COLUMN IF NOT EXISTS brl_usage_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (brl_usage_percentage >= 0 AND brl_usage_percentage <= 100),

-- Pause tracking
ADD COLUMN IF NOT EXISTS pause_reason TEXT CHECK (pause_reason IN ('token_limit', 'brl_limit', 'both', NULL));

-- Step 3: Migrate existing data
UPDATE client_budgets
SET
  -- Migrate to new columns
  budget_mode = COALESCE(budget_mode, budget_type, 'brl'), -- Use existing budget_type if budget_mode is null
  brl_limit = COALESCE(brl_limit, CASE WHEN budget_type = 'brl' OR budget_type = 'usd' THEN budget_limit ELSE 0 END),
  token_limit = COALESCE(token_limit, CASE WHEN budget_type = 'tokens' THEN budget_limit::BIGINT ELSE 0 END),
  current_brl = COALESCE(current_brl, CASE WHEN budget_type = 'brl' OR budget_type = 'usd' THEN current_usage ELSE 0 END),
  current_tokens = COALESCE(current_tokens, CASE WHEN budget_type = 'tokens' THEN current_usage::BIGINT ELSE 0 END),
  brl_usage_percentage = COALESCE(brl_usage_percentage, CASE WHEN budget_type = 'brl' OR budget_type = 'usd' THEN usage_percentage ELSE 0 END),
  token_usage_percentage = COALESCE(token_usage_percentage, CASE WHEN budget_type = 'tokens' THEN usage_percentage ELSE 0 END),
  -- Keep old columns filled for backward compatibility (budget_type constraint: tokens/brl/usd)
  budget_type = COALESCE(budget_type,
    CASE
      WHEN budget_mode = 'both' THEN 'brl' -- Map 'both' to 'brl' for old constraint
      ELSE budget_mode
    END,
    'brl'),
  budget_limit = COALESCE(budget_limit,
    CASE
      WHEN budget_mode = 'tokens' THEN token_limit
      WHEN budget_mode = 'brl' THEN brl_limit
      WHEN budget_mode = 'both' THEN brl_limit -- Use BRL limit for backward compatibility
      ELSE 0
    END);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_budgets_budget_mode ON client_budgets(budget_mode);
CREATE INDEX IF NOT EXISTS idx_client_budgets_token_usage ON client_budgets(token_usage_percentage) WHERE budget_mode IN ('tokens', 'both');
CREATE INDEX IF NOT EXISTS idx_client_budgets_brl_usage ON client_budgets(brl_usage_percentage) WHERE budget_mode IN ('brl', 'both');

-- Comments
COMMENT ON COLUMN client_budgets.budget_mode IS 'Budget tracking mode: tokens (count), brl (R$), both (hybrid - whichever limit is hit first)';
COMMENT ON COLUMN client_budgets.token_limit IS 'Maximum tokens allowed in period (0 = unlimited)';
COMMENT ON COLUMN client_budgets.current_tokens IS 'Current token usage in period';
COMMENT ON COLUMN client_budgets.brl_limit IS 'Maximum BRL allowed in period (0 = unlimited)';
COMMENT ON COLUMN client_budgets.current_brl IS 'Current BRL usage in period';
COMMENT ON COLUMN client_budgets.pause_reason IS 'Which limit triggered the pause (token_limit, brl_limit, both)';

-- =====================================================
-- 2. AUTO-CALCULATE USAGE PERCENTAGES
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_modular_budget_percentages()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate token percentage
  IF NEW.token_limit > 0 THEN
    NEW.token_usage_percentage = ROUND((NEW.current_tokens::NUMERIC / NEW.token_limit::NUMERIC) * 100, 2);
  ELSE
    NEW.token_usage_percentage = 0;
  END IF;

  -- Calculate BRL percentage
  IF NEW.brl_limit > 0 THEN
    NEW.brl_usage_percentage = ROUND((NEW.current_brl / NEW.brl_limit) * 100, 2);
  ELSE
    NEW.brl_usage_percentage = 0;
  END IF;

  -- For backward compatibility, set usage_percentage to the highest
  NEW.usage_percentage = GREATEST(NEW.token_usage_percentage, NEW.brl_usage_percentage);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS client_budgets_calculate_percentage ON client_budgets;

-- Create new trigger
CREATE TRIGGER client_budgets_calculate_modular_percentages
  BEFORE INSERT OR UPDATE OF current_tokens, token_limit, current_brl, brl_limit ON client_budgets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_modular_budget_percentages();

-- =====================================================
-- 3. UNIFIED BUDGET INCREMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION increment_unified_budget(
  p_client_id UUID,
  p_tokens BIGINT,
  p_cost_brl NUMERIC
)
RETURNS void AS $$
DECLARE
  v_budget client_budgets%ROWTYPE;
  v_should_pause BOOLEAN := false;
  v_pause_reason TEXT := NULL;
BEGIN
  -- Get current budget
  SELECT * INTO v_budget
  FROM client_budgets
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    -- No budget configured, allow unlimited
    RETURN;
  END IF;

  -- Increment based on mode
  CASE v_budget.budget_mode
    WHEN 'tokens' THEN
      -- Token-only mode
      UPDATE client_budgets
      SET current_tokens = current_tokens + p_tokens
      WHERE client_id = p_client_id;

      -- Check if limit reached
      IF v_budget.token_limit > 0 AND (v_budget.current_tokens + p_tokens) >= v_budget.token_limit THEN
        v_should_pause := true;
        v_pause_reason := 'token_limit';
      END IF;

    WHEN 'brl' THEN
      -- BRL-only mode
      UPDATE client_budgets
      SET current_brl = current_brl + p_cost_brl
      WHERE client_id = p_client_id;

      -- Check if limit reached
      IF v_budget.brl_limit > 0 AND (v_budget.current_brl + p_cost_brl) >= v_budget.brl_limit THEN
        v_should_pause := true;
        v_pause_reason := 'brl_limit';
      END IF;

    WHEN 'both' THEN
      -- Hybrid mode: track BOTH
      UPDATE client_budgets
      SET
        current_tokens = current_tokens + p_tokens,
        current_brl = current_brl + p_cost_brl
      WHERE client_id = p_client_id;

      -- Check BOTH limits
      IF v_budget.token_limit > 0 AND (v_budget.current_tokens + p_tokens) >= v_budget.token_limit THEN
        v_should_pause := true;
        v_pause_reason := 'token_limit';
      END IF;

      IF v_budget.brl_limit > 0 AND (v_budget.current_brl + p_cost_brl) >= v_budget.brl_limit THEN
        IF v_pause_reason = 'token_limit' THEN
          v_pause_reason := 'both'; -- Both limits hit!
        ELSE
          v_pause_reason := 'brl_limit';
        END IF;
        v_should_pause := true;
      END IF;
  END CASE;

  -- Auto-pause if needed
  IF v_should_pause AND v_budget.pause_at_limit AND NOT v_budget.is_paused THEN
    UPDATE client_budgets
    SET
      is_paused = true,
      pause_reason = v_pause_reason
    WHERE client_id = p_client_id;

    -- TODO: Send alert email/webhook
    RAISE NOTICE 'Client % paused due to: %', p_client_id, v_pause_reason;
  END IF;

  -- Trigger alert flags (80%, 90%, 100%)
  -- Token alerts
  IF v_budget.budget_mode IN ('tokens', 'both') AND v_budget.token_limit > 0 THEN
    UPDATE client_budgets
    SET
      alert_80_sent = CASE WHEN token_usage_percentage >= 80 THEN true ELSE alert_80_sent END,
      alert_90_sent = CASE WHEN token_usage_percentage >= 90 THEN true ELSE alert_90_sent END,
      alert_100_sent = CASE WHEN token_usage_percentage >= 100 THEN true ELSE alert_100_sent END
    WHERE client_id = p_client_id;
  END IF;

  -- BRL alerts
  IF v_budget.budget_mode IN ('brl', 'both') AND v_budget.brl_limit > 0 THEN
    UPDATE client_budgets
    SET
      alert_80_sent = CASE WHEN brl_usage_percentage >= 80 THEN true ELSE alert_80_sent END,
      alert_90_sent = CASE WHEN brl_usage_percentage >= 90 THEN true ELSE alert_90_sent END,
      alert_100_sent = CASE WHEN brl_usage_percentage >= 100 THEN true ELSE alert_100_sent END
    WHERE client_id = p_client_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_unified_budget IS 'Unified budget increment for ALL API types (Gateway + TTS + Whisper + Vision + Embeddings). Tracks tokens AND BRL based on budget_mode.';

-- =====================================================
-- 4. CHECK BUDGET AVAILABLE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_budget_available(
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
    -- No budget configured = unlimited
    RETURN true;
  END IF;

  -- If already paused, deny
  IF v_budget.is_paused THEN
    RETURN false;
  END IF;

  -- Check based on mode
  CASE v_budget.budget_mode
    WHEN 'tokens' THEN
      -- Check token limit
      IF v_budget.token_limit > 0 AND v_budget.current_tokens >= v_budget.token_limit THEN
        RETURN false;
      END IF;

    WHEN 'brl' THEN
      -- Check BRL limit
      IF v_budget.brl_limit > 0 AND v_budget.current_brl >= v_budget.brl_limit THEN
        RETURN false;
      END IF;

    WHEN 'both' THEN
      -- Check BOTH (deny if ANY limit reached)
      IF (v_budget.token_limit > 0 AND v_budget.current_tokens >= v_budget.token_limit) OR
         (v_budget.brl_limit > 0 AND v_budget.current_brl >= v_budget.brl_limit) THEN
        RETURN false;
      END IF;
  END CASE;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_budget_available IS 'Checks if client has budget available. Returns false if ANY limit is reached (in both mode).';

-- =====================================================
-- 5. RESET BUDGET FUNCTION (Updated)
-- =====================================================

CREATE OR REPLACE FUNCTION reset_budget_usage(
  p_client_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE client_budgets
  SET
    current_tokens = 0,
    current_brl = 0,
    token_usage_percentage = 0,
    brl_usage_percentage = 0,
    usage_percentage = 0,
    last_reset_at = NOW(),
    alert_80_sent = false,
    alert_90_sent = false,
    alert_100_sent = false,
    is_paused = false,
    pause_reason = NULL
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. HELPER VIEW: Budget Status
-- =====================================================

CREATE OR REPLACE VIEW budget_status AS
SELECT
  cb.client_id,
  c.name as client_name,
  cb.budget_mode,

  -- Token budget
  cb.token_limit,
  cb.current_tokens,
  cb.token_usage_percentage,

  -- BRL budget
  cb.brl_limit,
  cb.current_brl,
  cb.brl_usage_percentage,

  -- Overall status
  cb.usage_percentage,
  cb.is_paused,
  cb.pause_reason,
  cb.pause_at_limit,

  -- Alerts
  cb.alert_80_sent,
  cb.alert_90_sent,
  cb.alert_100_sent,

  -- Period info
  cb.budget_period,
  cb.last_reset_at,
  cb.next_reset_at,

  -- Status indicators
  CASE
    WHEN cb.is_paused THEN 'PAUSED'
    WHEN cb.usage_percentage >= 100 THEN 'LIMIT_REACHED'
    WHEN cb.usage_percentage >= 90 THEN 'CRITICAL'
    WHEN cb.usage_percentage >= 80 THEN 'WARNING'
    ELSE 'NORMAL'
  END as status

FROM client_budgets cb
JOIN clients c ON c.id = cb.client_id;

COMMENT ON VIEW budget_status IS 'Consolidated view of client budget status with indicators';

-- Grant access
GRANT SELECT ON budget_status TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Migration completed successfully
-- Use /dashboard/admin/budget-plans to configure budgets for each client
DO $$
BEGIN
  RAISE NOTICE '✅ Modular budget system migration completed successfully';
  RAISE NOTICE 'New budget modes available: tokens, brl, both (hybrid)';
  RAISE NOTICE 'Configure budgets at: /dashboard/admin/budget-plans';
END $$;
