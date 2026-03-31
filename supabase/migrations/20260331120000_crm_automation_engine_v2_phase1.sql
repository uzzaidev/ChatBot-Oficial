-- =============================================================================
-- CRM Automation Engine V2 - Phase 1 Foundation
-- Date: 2026-03-31
-- =============================================================================

-- 1) Extend crm_automation_rules for v2 contracts
ALTER TABLE IF EXISTS crm_automation_rules
  ADD COLUMN IF NOT EXISTS condition_tree JSONB,
  ADD COLUMN IF NOT EXISTS action_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Backfill action_steps from legacy action_type/action_params when empty
UPDATE crm_automation_rules
SET action_steps = jsonb_build_array(
  jsonb_build_object(
    'action_type', action_type,
    'action_params', COALESCE(action_params, '{}'::jsonb),
    'on_error', 'stop'
  )
)
WHERE (action_steps IS NULL OR action_steps = '[]'::jsonb)
  AND action_type IS NOT NULL;

-- 2) Trigger to increment rule version only when logic-relevant fields change
CREATE OR REPLACE FUNCTION increment_crm_rule_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.trigger_type, COALESCE(NEW.condition_tree, '{}'::jsonb)::text, COALESCE(NEW.action_steps, '[]'::jsonb)::text)
     IS DISTINCT FROM
     (OLD.trigger_type, COALESCE(OLD.condition_tree, '{}'::jsonb)::text, COALESCE(OLD.action_steps, '[]'::jsonb)::text)
  THEN
    NEW.version = COALESCE(OLD.version, 1) + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_rule_version ON crm_automation_rules;
CREATE TRIGGER trg_increment_rule_version
  BEFORE UPDATE ON crm_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION increment_crm_rule_version();

-- 3) Extend crm_rule_executions with idempotency / trace metadata
ALTER TABLE IF EXISTS crm_rule_executions
  ADD COLUMN IF NOT EXISTS event_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS event_hash TEXT,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS trace_id UUID,
  ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS result JSONB,
  ADD COLUMN IF NOT EXISTS rule_version INTEGER NOT NULL DEFAULT 1;

-- Backfill minimal dedupe key for historical rows
UPDATE crm_rule_executions
SET dedupe_key = COALESCE(
  dedupe_key,
  md5(
    COALESCE(rule_id::text, '') || ':' ||
    COALESCE(card_id::text, '') || ':' ||
    COALESCE(trigger_data::text, '{}') || ':' ||
    COALESCE(executed_at::text, '')
  )
)
WHERE dedupe_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_rule_exec_event_hash
  ON crm_rule_executions(event_hash)
  WHERE event_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_rule_exec_trace_depth
  ON crm_rule_executions(trace_id, depth)
  WHERE trace_id IS NOT NULL;

-- Remove duplicates before creating unique idempotency index
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, rule_id, dedupe_key
      ORDER BY executed_at DESC, id DESC
    ) AS rn
  FROM crm_rule_executions
  WHERE status = 'success'
    AND dedupe_key IS NOT NULL
)
DELETE FROM crm_rule_executions e
USING ranked r
WHERE e.id = r.id
  AND r.rn > 1;

-- Idempotency key: only one SUCCESS per (client, rule, dedupe_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_rule_exec_success_dedupe
  ON crm_rule_executions(client_id, rule_id, dedupe_key)
  WHERE status = 'success' AND dedupe_key IS NOT NULL;

-- 4) Rollout controls: global flag + tenant opt-in
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (key, enabled, description)
VALUES ('crm_engine_v2_enabled', TRUE, 'Master switch para o CRM Automation Engine V2')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = NOW();

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS crm_engine_v2 BOOLEAN NOT NULL DEFAULT TRUE;

-- 5) Deprecate legacy SQL processor (Engine TS is canonical)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'process_crm_automation_rules'
      AND n.nspname = 'public'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = '_deprecated_process_crm_automation_rules'
      AND n.nspname = 'public'
  ) THEN
    ALTER FUNCTION public.process_crm_automation_rules(UUID, UUID, TEXT, JSONB)
      RENAME TO _deprecated_process_crm_automation_rules;
  END IF;
END $$;

-- =============================================================================
-- END
-- =============================================================================
