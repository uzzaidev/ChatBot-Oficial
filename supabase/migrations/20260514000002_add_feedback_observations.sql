-- ──────────────────────────────────────────────────────────────────────────────
-- Add observations column to assistant_feedback
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assistant_feedback
  ADD COLUMN IF NOT EXISTS observations TEXT;

COMMENT ON COLUMN public.assistant_feedback.observations IS
  'Optional free-text note the user can add when submitting feedback.';
