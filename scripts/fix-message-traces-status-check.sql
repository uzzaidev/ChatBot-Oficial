-- ============================================================================
-- HOTFIX: permitir status 'success' em public.message_traces
-- ============================================================================
-- Execute no Supabase SQL Editor (produção) para corrigir o CHECK constraint
-- que hoje bloqueia a reconciliação de traces.

DO $$
DECLARE
  status_constraint_name text;
BEGIN
  -- Descobre o nome real do CHECK de status atual
  SELECT c.conname
    INTO status_constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'message_traces'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    AND pg_get_constraintdef(c.oid) ILIKE '%pending%'
    AND pg_get_constraintdef(c.oid) ILIKE '%failed%'
  LIMIT 1;

  IF status_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.message_traces DROP CONSTRAINT %I',
      status_constraint_name
    );
  END IF;

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
END $$;

-- Verificação rápida
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'message_traces_status_check';
