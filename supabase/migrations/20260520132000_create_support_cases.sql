-- ============================================================================
-- MIGRATION: Support cases tracking
-- ============================================================================
-- Goal:
--   - Persist support/bug signals detected from client conversations
--   - Classify probable root cause (prompt/flow/system/unknown)
--   - Keep tenant isolation with RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  trace_id UUID,
  conversation_id UUID,

  phone TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT,
  detected_intent TEXT,

  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  root_cause_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (root_cause_type IN ('prompt', 'flow', 'system', 'unknown')),
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.500
    CHECK (confidence >= 0 AND confidence <= 1),

  recommended_action TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'dismissed')),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_cases_client_id_created_at
  ON public.support_cases(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_cases_status
  ON public.support_cases(status);

CREATE INDEX IF NOT EXISTS idx_support_cases_root_cause
  ON public.support_cases(root_cause_type);

CREATE INDEX IF NOT EXISTS idx_support_cases_severity
  ON public.support_cases(severity);

CREATE INDEX IF NOT EXISTS idx_support_cases_trace_id
  ON public.support_cases(trace_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_cases_client_trace_unique
  ON public.support_cases(client_id, trace_id)
  WHERE trace_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS trg_support_cases_updated_at ON public.support_cases;
    CREATE TRIGGER trg_support_cases_updated_at
      BEFORE UPDATE ON public.support_cases
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_cases'
      AND policyname = 'support_cases_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "support_cases_service_role"
      ON public.support_cases
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'support_cases'
        AND policyname = 'support_cases_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "support_cases_tenant_isolation"
        ON public.support_cases
        FOR ALL
        TO authenticated
        USING (
          client_id IN (
            SELECT up.client_id
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
          )
        )
        WITH CHECK (
          client_id IN (
            SELECT up.client_id
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
          )
        )
      ';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_traces'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'support_cases'
        AND constraint_name = 'support_cases_trace_id_fkey'
    ) THEN
      ALTER TABLE public.support_cases
        ADD CONSTRAINT support_cases_trace_id_fkey
        FOREIGN KEY (trace_id) REFERENCES public.message_traces(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'support_cases'
        AND constraint_name = 'support_cases_conversation_id_fkey'
    ) THEN
      ALTER TABLE public.support_cases
        ADD CONSTRAINT support_cases_conversation_id_fkey
        FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'support_cases'
        AND constraint_name = 'support_cases_client_id_fkey'
    ) THEN
      ALTER TABLE public.support_cases
        ADD CONSTRAINT support_cases_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_cases TO authenticated;
GRANT ALL ON public.support_cases TO service_role;

COMMENT ON TABLE public.support_cases IS
  'Support and bug reports captured from conversation traces for triage and continuous improvement.';
