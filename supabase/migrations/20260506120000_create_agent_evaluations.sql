-- ============================================================================
-- MIGRATION: Agent evaluations (Sprint 3)
-- ============================================================================
-- Date: 2026-05-06
-- Goal:
--   - Persist automatic judge outputs per trace
--   - Enforce idempotency (1 evaluation per trace)
--   - Multi-tenant isolation via RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  client_id UUID NOT NULL,
  ground_truth_id UUID,

  judge_model TEXT NOT NULL,
  judge_prompt_version TEXT NOT NULL DEFAULT 'v1',

  alignment_score FLOAT CHECK (alignment_score IS NULL OR (alignment_score >= 0 AND alignment_score <= 10)),
  relevance_score FLOAT CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 10)),
  finality_score FLOAT NOT NULL CHECK (finality_score >= 0 AND finality_score <= 10),
  safety_score FLOAT NOT NULL CHECK (safety_score >= 0 AND safety_score <= 10),
  composite_score FLOAT NOT NULL CHECK (composite_score >= 0 AND composite_score <= 10),

  alignment_reasoning TEXT,
  relevance_reasoning TEXT,
  finality_reasoning TEXT,
  safety_reasoning TEXT,

  verdict TEXT NOT NULL CHECK (verdict IN ('PASS', 'REVIEW', 'FAIL')),

  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(12, 8),
  duration_ms INT,

  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_evaluations_trace_id
  ON public.agent_evaluations(trace_id);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_client_id
  ON public.agent_evaluations(client_id);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_ground_truth_id
  ON public.agent_evaluations(ground_truth_id);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_composite
  ON public.agent_evaluations(composite_score);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_verdict
  ON public.agent_evaluations(verdict);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_evaluated_at
  ON public.agent_evaluations(evaluated_at DESC);

ALTER TABLE public.agent_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_evaluations'
      AND policyname = 'agent_evaluations_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "agent_evaluations_service_role"
      ON public.agent_evaluations
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
        AND tablename = 'agent_evaluations'
        AND policyname = 'agent_evaluations_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "agent_evaluations_tenant_isolation"
          ON public.agent_evaluations
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
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_members'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'uzzapp_clients'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'agent_evaluations'
        AND policyname = 'agent_evaluations_tenant_isolation_company_members'
    ) THEN
      EXECUTE '
        CREATE POLICY "agent_evaluations_tenant_isolation_company_members"
          ON public.agent_evaluations
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = agent_evaluations.client_id
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = agent_evaluations.client_id
            )
          )
      ';
    END IF;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_evaluations TO authenticated;
GRANT ALL ON public.agent_evaluations TO service_role;

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
        AND table_name = 'agent_evaluations'
        AND constraint_name = 'agent_evaluations_trace_id_fkey'
    ) THEN
      ALTER TABLE public.agent_evaluations
        ADD CONSTRAINT agent_evaluations_trace_id_fkey
        FOREIGN KEY (trace_id) REFERENCES public.message_traces(id) ON DELETE CASCADE;
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
        AND table_name = 'agent_evaluations'
        AND constraint_name = 'agent_evaluations_ground_truth_id_fkey'
    ) THEN
      ALTER TABLE public.agent_evaluations
        ADD CONSTRAINT agent_evaluations_ground_truth_id_fkey
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
        AND table_name = 'agent_evaluations'
        AND constraint_name = 'agent_evaluations_client_id_fkey'
    ) THEN
      ALTER TABLE public.agent_evaluations
        ADD CONSTRAINT agent_evaluations_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.agent_evaluations IS
  'Automatic quality evaluations (judge model) for each trace_id with dimensional scores and verdict.';

