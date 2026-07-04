-- ============================================================================
-- MIGRATION: Agent QA (question battery + saved reports)
-- ============================================================================
-- Date: 2026-06-13
-- Goal:
--   - Store a reusable battery of QA questions per agent (agents.qa_questions)
--   - Persist QA run reports: each question + how the agent answered it,
--     so they can be reviewed later and fed to a prompt evaluator
--   - Multi-tenant isolation via RLS (mirrors agent_prompt_evaluations pattern)
-- ============================================================================

-- ── 1. Reusable question battery saved on the agent ─────────────────────────
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS qa_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.agents.qa_questions IS
  'Reusable QA battery: array of { id, text } questions run against the agent.';

-- ── 2. Saved QA reports ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_qa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  agent_id UUID NOT NULL,

  -- Optional human label for the run (e.g. "Bateria pós-ajuste de tom")
  label TEXT,

  -- Snapshot of the agent config used to produce these answers, so a later
  -- evaluator knows exactly what prompt/model generated each response.
  agent_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Provider/model actually used during the run (for quick display/filtering)
  provider TEXT,
  model_used TEXT,

  -- Array of per-question results (see AgentQAResultItem in src/lib/types.ts):
  --   { id, question, response, latencyMs, model, provider, error,
  --     toolCallNames[], ragChunkCount, historySource }
  results JSONB NOT NULL DEFAULT '[]'::jsonb,

  question_count INT NOT NULL DEFAULT 0,
  total_latency_ms INT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_qa_reports_agent_id
  ON public.agent_qa_reports(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_qa_reports_client_id
  ON public.agent_qa_reports(client_id);

CREATE INDEX IF NOT EXISTS idx_agent_qa_reports_created_at
  ON public.agent_qa_reports(created_at DESC);

-- ── Conditional FK (only if agents table exists in this environment) ────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agents'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'agent_qa_reports'
      AND constraint_name = 'agent_qa_reports_agent_id_fkey'
  ) THEN
    EXECUTE '
      ALTER TABLE public.agent_qa_reports
        ADD CONSTRAINT agent_qa_reports_agent_id_fkey
        FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE
    ';
  END IF;
END $$;

ALTER TABLE public.agent_qa_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_qa_reports'
      AND policyname = 'agent_qa_reports_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "agent_qa_reports_service_role"
      ON public.agent_qa_reports
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
        AND tablename = 'agent_qa_reports'
        AND policyname = 'agent_qa_reports_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "agent_qa_reports_tenant_isolation"
          ON public.agent_qa_reports
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_qa_reports TO authenticated;
GRANT ALL ON public.agent_qa_reports TO service_role;

COMMENT ON TABLE public.agent_qa_reports IS
  'Saved QA runs: a battery of questions and how the agent answered each, for later review and prompt evaluation.';
COMMENT ON COLUMN public.agent_qa_reports.results IS
  'Array of AgentQAResultItem objects (see src/lib/types.ts).';
COMMENT ON COLUMN public.agent_qa_reports.agent_snapshot IS
  'Snapshot of the agent config that produced these answers (model, prompts, settings).';
