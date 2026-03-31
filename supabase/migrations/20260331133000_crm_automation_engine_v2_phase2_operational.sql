-- =============================================================================
-- CRM Automation Engine V2 - Phase 2/3/4 Operational Contracts
-- Date: 2026-03-31
-- =============================================================================

-- 1) Retry / Dead Letter Queue for external actions
CREATE TABLE IF NOT EXISTS crm_action_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES crm_rule_executions(id) ON DELETE SET NULL,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES crm_automation_rules(id) ON DELETE SET NULL,
  step_index INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  final_error TEXT,
  next_retry_at TIMESTAMPTZ,
  exhausted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_action_dlq_next_retry
  ON crm_action_dlq(next_retry_at)
  WHERE exhausted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_action_dlq_client_created
  ON crm_action_dlq(client_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_action_dlq_active_step
  ON crm_action_dlq(client_id, card_id, rule_id, step_index, action_type)
  WHERE exhausted_at IS NULL;

-- 2) Scheduled actions for delayed automation steps
CREATE TABLE IF NOT EXISTS crm_scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES crm_automation_rules(id) ON DELETE SET NULL,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  execute_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  trace_id UUID,
  depth INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_scheduled_actions_status_check
    CHECK (status IN ('pending', 'executed', 'cancelled', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_crm_scheduled_actions_execute
  ON crm_scheduled_actions(execute_at, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_crm_scheduled_actions_client
  ON crm_scheduled_actions(client_id, created_at DESC);

-- 3) CRM settings additions for payment follow-up and silence window
ALTER TABLE IF EXISTS crm_settings
  ADD COLUMN IF NOT EXISTS next_steps_template TEXT,
  ADD COLUMN IF NOT EXISTS notif_silence_start TIME DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS notif_silence_end TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS client_timezone TEXT DEFAULT 'America/Sao_Paulo';

-- =============================================================================
-- END
-- =============================================================================
