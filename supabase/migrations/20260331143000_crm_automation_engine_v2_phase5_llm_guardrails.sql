-- =============================================================================
-- CRM Automation Engine V2 - Phase 5 LLM Guardrails
-- Date: 2026-03-31
-- =============================================================================

ALTER TABLE IF EXISTS crm_settings
  ADD COLUMN IF NOT EXISTS llm_intent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS llm_intent_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85;

-- Optional safety check to keep threshold in valid range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_settings_llm_intent_threshold_check'
  ) THEN
    ALTER TABLE crm_settings
      ADD CONSTRAINT crm_settings_llm_intent_threshold_check
      CHECK (llm_intent_threshold >= 0 AND llm_intent_threshold <= 1);
  END IF;
END $$;

-- =============================================================================
-- END
-- =============================================================================
