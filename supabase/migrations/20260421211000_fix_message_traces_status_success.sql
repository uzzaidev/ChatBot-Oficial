-- ============================================================================
-- MIGRATION: message_traces status compatibility for success traces
-- ============================================================================
-- Date: 2026-04-21
-- Goal:
--   - Allow status='success' on public.message_traces
--   - Keep compatibility with existing evaluated/review lifecycle statuses
-- ============================================================================

DO $$
DECLARE
  status_constraint_name text;
  status_constraint_def text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_traces'
  ) THEN
    SELECT c.conname, pg_get_constraintdef(c.oid)
      INTO status_constraint_name, status_constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'message_traces'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      AND pg_get_constraintdef(c.oid) ILIKE '%pending%'
      AND pg_get_constraintdef(c.oid) ILIKE '%evaluated%'
      AND pg_get_constraintdef(c.oid) ILIKE '%needs_review%'
      AND pg_get_constraintdef(c.oid) ILIKE '%failed%'
    LIMIT 1;

    IF status_constraint_name IS NOT NULL
       AND status_constraint_def NOT ILIKE '%success%'
    THEN
      EXECUTE format(
        'ALTER TABLE public.message_traces DROP CONSTRAINT %I',
        status_constraint_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'message_traces'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%status%'
        AND pg_get_constraintdef(c.oid) ILIKE '%success%'
        AND pg_get_constraintdef(c.oid) ILIKE '%evaluated%'
        AND pg_get_constraintdef(c.oid) ILIKE '%human_reviewed%'
        AND pg_get_constraintdef(c.oid) ILIKE '%needs_review%'
        AND pg_get_constraintdef(c.oid) ILIKE '%failed%'
    ) THEN
      ALTER TABLE public.message_traces
        ADD CONSTRAINT message_traces_status_check
        CHECK (
          status IN (
            'pending',
            'success',
            'evaluated',
            'human_reviewed',
            'needs_review',
            'failed'
          )
        );
    END IF;
  END IF;
END $$;
