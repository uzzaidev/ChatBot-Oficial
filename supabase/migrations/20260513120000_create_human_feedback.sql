-- ============================================================================
-- MIGRATION: Human feedback (Sprint 4)
-- ============================================================================
-- Date: 2026-05-13
-- Goal:
--   - Persist operator review for evaluations/traces
--   - Enable promote-to-ground-truth auditability
--   - Enforce multi-tenant isolation with RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.human_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  evaluation_id UUID,
  client_id UUID NOT NULL,
  operator_id UUID NOT NULL,

  verdict TEXT NOT NULL CHECK (verdict IN ('correct', 'incorrect', 'partial')),

  correction_text TEXT,
  reason TEXT,
  error_category TEXT CHECK (
    error_category IS NULL
    OR error_category IN (
      'wrong_chunk',
      'bad_generation',
      'missing_info',
      'hallucination',
      'gt_outdated',
      'other'
    )
  ),

  marked_as_ground_truth BOOLEAN NOT NULL DEFAULT false,
  ground_truth_id UUID,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_human_feedback_trace_id
  ON public.human_feedback(trace_id);

CREATE INDEX IF NOT EXISTS idx_human_feedback_operator_id
  ON public.human_feedback(operator_id);

CREATE INDEX IF NOT EXISTS idx_human_feedback_verdict
  ON public.human_feedback(verdict);

CREATE INDEX IF NOT EXISTS idx_human_feedback_created_at
  ON public.human_feedback(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_human_feedback_trace_operator
  ON public.human_feedback(trace_id, operator_id);

ALTER TABLE public.human_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'human_feedback'
      AND policyname = 'human_feedback_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "human_feedback_service_role"
      ON public.human_feedback
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
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'human_feedback'
        AND policyname = 'human_feedback_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "human_feedback_tenant_isolation"
          ON public.human_feedback
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
    WHERE table_schema = 'public' AND table_name = 'company_members'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'uzzapp_clients'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'human_feedback'
        AND policyname = 'human_feedback_tenant_isolation_company_members'
    ) THEN
      EXECUTE '
        CREATE POLICY "human_feedback_tenant_isolation_company_members"
          ON public.human_feedback
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = human_feedback.client_id
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = human_feedback.client_id
            )
          )
      ';
    END IF;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.human_feedback TO authenticated;
GRANT ALL ON public.human_feedback TO service_role;

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
        AND table_name = 'human_feedback'
        AND constraint_name = 'human_feedback_trace_id_fkey'
    ) THEN
      ALTER TABLE public.human_feedback
        ADD CONSTRAINT human_feedback_trace_id_fkey
        FOREIGN KEY (trace_id) REFERENCES public.message_traces(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agent_evaluations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'human_feedback'
        AND constraint_name = 'human_feedback_evaluation_id_fkey'
    ) THEN
      ALTER TABLE public.human_feedback
        ADD CONSTRAINT human_feedback_evaluation_id_fkey
        FOREIGN KEY (evaluation_id) REFERENCES public.agent_evaluations(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ground_truth'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'human_feedback'
        AND constraint_name = 'human_feedback_ground_truth_id_fkey'
    ) THEN
      ALTER TABLE public.human_feedback
        ADD CONSTRAINT human_feedback_ground_truth_id_fkey
        FOREIGN KEY (ground_truth_id) REFERENCES public.ground_truth(id) ON DELETE SET NULL;
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
        AND table_name = 'human_feedback'
        AND constraint_name = 'human_feedback_client_id_fkey'
    ) THEN
      ALTER TABLE public.human_feedback
        ADD CONSTRAINT human_feedback_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'human_feedback'
        AND constraint_name = 'human_feedback_operator_id_fkey'
    ) THEN
      ALTER TABLE public.human_feedback
        ADD CONSTRAINT human_feedback_operator_id_fkey
        FOREIGN KEY (operator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.human_feedback IS
  'Manual operator review for traces/evaluations, with optional promote-to-ground-truth linkage.';
