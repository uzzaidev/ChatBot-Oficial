-- ============================================================================
-- MIGRATION: Agent prompt evaluations (specialist prompt review)
-- ============================================================================
-- Date: 2026-05-31
-- Goal:
--   - Persist AI "prompt engineer" reviews of an agent's compiled system prompt
--   - Store per-section suggestions (mapped back to editor fields) + apply state
--   - Optionally reference a real message_traces row that motivated the review
--   - Multi-tenant isolation via RLS (mirrors agent_evaluations pattern)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_prompt_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  agent_id UUID NOT NULL,

  -- Optional: a real message that motivated this review (item 3)
  trace_id UUID,

  -- Which model acted as the "prompt engineer"
  evaluator_provider TEXT NOT NULL,
  evaluator_model TEXT NOT NULL,

  -- Snapshot of exactly what was reviewed (compiled system + formatter prompt)
  prompt_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Free-text overall assessment + a 0-100 quality score
  overall_assessment TEXT,
  overall_score INT CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),

  -- Array of structured suggestions (see prompt-evaluator.ts PromptSuggestion)
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Lifecycle of the whole review
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_applied', 'applied', 'dismissed')),

  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(12, 8),
  duration_ms INT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_evaluations_agent_id
  ON public.agent_prompt_evaluations(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_evaluations_client_id
  ON public.agent_prompt_evaluations(client_id);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_evaluations_trace_id
  ON public.agent_prompt_evaluations(trace_id);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_evaluations_created_at
  ON public.agent_prompt_evaluations(created_at DESC);

-- ── Conditional FKs (only if referenced tables exist in this environment) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agents'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'agent_prompt_evaluations'
      AND constraint_name = 'agent_prompt_evaluations_agent_id_fkey'
  ) THEN
    EXECUTE '
      ALTER TABLE public.agent_prompt_evaluations
        ADD CONSTRAINT agent_prompt_evaluations_agent_id_fkey
        FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_traces'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'agent_prompt_evaluations'
      AND constraint_name = 'agent_prompt_evaluations_trace_id_fkey'
  ) THEN
    EXECUTE '
      ALTER TABLE public.agent_prompt_evaluations
        ADD CONSTRAINT agent_prompt_evaluations_trace_id_fkey
        FOREIGN KEY (trace_id) REFERENCES public.message_traces(id) ON DELETE SET NULL
    ';
  END IF;
END $$;

ALTER TABLE public.agent_prompt_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_prompt_evaluations'
      AND policyname = 'agent_prompt_evaluations_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "agent_prompt_evaluations_service_role"
      ON public.agent_prompt_evaluations
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
        AND tablename = 'agent_prompt_evaluations'
        AND policyname = 'agent_prompt_evaluations_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "agent_prompt_evaluations_tenant_isolation"
          ON public.agent_prompt_evaluations
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_prompt_evaluations TO authenticated;
GRANT ALL ON public.agent_prompt_evaluations TO service_role;

COMMENT ON TABLE public.agent_prompt_evaluations IS
  'AI prompt-engineer reviews of an agent compiled system prompt, with per-section suggestions and apply state.';
COMMENT ON COLUMN public.agent_prompt_evaluations.suggestions IS
  'Array of PromptSuggestion objects (see src/lib/prompt-evaluator.ts).';
COMMENT ON COLUMN public.agent_prompt_evaluations.trace_id IS
  'Optional message_traces.id that motivated this review (message-grounded evaluation).';
