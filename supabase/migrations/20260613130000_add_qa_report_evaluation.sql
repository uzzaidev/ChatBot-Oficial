-- ============================================================================
-- MIGRATION: QA report AI evaluation
-- ============================================================================
-- Date: 2026-06-13
-- Goal:
--   - Store the AI evaluation of a saved QA report directly on the report:
--     per-question verdicts + applyable prompt suggestions + overall score.
-- ============================================================================

ALTER TABLE public.agent_qa_reports
  ADD COLUMN IF NOT EXISTS evaluation JSONB,
  ADD COLUMN IF NOT EXISTS evaluator_model TEXT,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agent_qa_reports.evaluation IS
  'AI evaluation of this report (see AgentQAEvaluation in src/lib/types.ts): overall score, per-question reviews and prompt suggestions.';
