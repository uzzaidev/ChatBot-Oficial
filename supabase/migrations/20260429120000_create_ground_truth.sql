-- ============================================================================
-- MIGRATION: Ground Truth foundation (Sprint 2)
-- ============================================================================
-- Date: 2026-04-29
-- Goal:
--   - Create public.ground_truth with immutable versioning
--   - Add pgvector RPC matcher (match_ground_truth)
--   - Enable RLS with tenant isolation (user_profiles and company_members fallback)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ground_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,

  -- Content
  user_query TEXT NOT NULL,
  expected_response TEXT NOT NULL,
  query_embedding VECTOR(1536),

  -- Classification
  category TEXT,
  subcategory TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Curation
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_by UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.70 CHECK (confidence >= 0 AND confidence <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Immutable versioning
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  parent_id UUID REFERENCES public.ground_truth(id) ON DELETE SET NULL,
  superseded_by UUID REFERENCES public.ground_truth(id) ON DELETE SET NULL,

  -- Provenance
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'mined', 'synthetic', 'operator_correction')),
  source_trace_id UUID,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ground_truth_client_id
  ON public.ground_truth(client_id);

CREATE INDEX IF NOT EXISTS idx_ground_truth_category
  ON public.ground_truth(category);

CREATE INDEX IF NOT EXISTS idx_ground_truth_is_active
  ON public.ground_truth(is_active);

CREATE INDEX IF NOT EXISTS idx_ground_truth_parent_id
  ON public.ground_truth(parent_id);

CREATE INDEX IF NOT EXISTS idx_ground_truth_source_trace_id
  ON public.ground_truth(source_trace_id);

CREATE INDEX IF NOT EXISTS idx_ground_truth_embedding
  ON public.ground_truth
  USING ivfflat (query_embedding vector_cosine_ops)
  WITH (lists = 50);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS trg_ground_truth_updated_at ON public.ground_truth;
    CREATE TRIGGER trg_ground_truth_updated_at
      BEFORE UPDATE ON public.ground_truth
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.ground_truth ENABLE ROW LEVEL SECURITY;

-- Service role bypass (system/backend writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ground_truth'
      AND policyname = 'ground_truth_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "ground_truth_service_role"
      ON public.ground_truth
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;
END $$;

-- Tenant isolation via user_profiles (default environment)
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
        AND tablename = 'ground_truth'
        AND policyname = 'ground_truth_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "ground_truth_tenant_isolation"
          ON public.ground_truth
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

-- Tenant isolation fallback via company_members + uzzapp_clients
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
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'ground_truth'
        AND policyname = 'ground_truth_tenant_isolation_company_members'
    ) THEN
      EXECUTE '
        CREATE POLICY "ground_truth_tenant_isolation_company_members"
          ON public.ground_truth
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = ground_truth.client_id
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = ground_truth.client_id
            )
          )
      ';
    END IF;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ground_truth TO authenticated;
GRANT ALL ON public.ground_truth TO service_role;

-- Optional FK to message_traces if table exists in this environment
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
        AND table_name = 'ground_truth'
        AND constraint_name = 'ground_truth_source_trace_id_fkey'
    ) THEN
      ALTER TABLE public.ground_truth
        ADD CONSTRAINT ground_truth_source_trace_id_fkey
        FOREIGN KEY (source_trace_id) REFERENCES public.message_traces(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Optional FK to clients if table exists in this environment
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
        AND table_name = 'ground_truth'
        AND constraint_name = 'ground_truth_client_id_fkey'
    ) THEN
      ALTER TABLE public.ground_truth
        ADD CONSTRAINT ground_truth_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.match_ground_truth(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.80,
  match_count INT DEFAULT 5,
  filter_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_query TEXT,
  expected_response TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[],
  confidence DECIMAL(3, 2),
  version INT,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    gt.id,
    gt.user_query,
    gt.expected_response,
    gt.category,
    gt.subcategory,
    gt.tags,
    gt.confidence,
    gt.version,
    1 - (gt.query_embedding <=> query_embedding) AS similarity
  FROM public.ground_truth gt
  WHERE gt.is_active = true
    AND gt.query_embedding IS NOT NULL
    AND (filter_client_id IS NULL OR gt.client_id = filter_client_id)
    AND 1 - (gt.query_embedding <=> query_embedding) >= match_threshold
  ORDER BY gt.query_embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON TABLE public.ground_truth IS
  'Ground truth catalog per tenant: immutable versions of expected answers for quality evaluation.';

COMMENT ON FUNCTION public.match_ground_truth(VECTOR, FLOAT, INT, UUID) IS
  'pgvector similarity matcher for ground truth entries scoped by client_id.';
