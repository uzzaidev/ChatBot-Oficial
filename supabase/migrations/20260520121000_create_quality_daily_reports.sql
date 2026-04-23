-- ============================================================================
-- MIGRATION: quality_daily_reports (S4/S5 operational analytics)
-- ============================================================================
-- Date: 2026-05-20
-- Goal:
--   - Persist daily KPI snapshots by tenant
--   - Enable automated cron-based reporting without manual SQL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quality_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  report_date DATE NOT NULL,

  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  total_traces INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  needs_review_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  pending_count INT NOT NULL DEFAULT 0,
  success_rate_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
  sem_agent_response INT NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(12, 2),
  p95_latency_ms NUMERIC(12, 2),

  pending_buckets JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_capture JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_coverage JSONB NOT NULL DEFAULT '{}'::jsonb,
  alerts_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (client_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_quality_daily_reports_client_date
  ON public.quality_daily_reports(client_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_quality_daily_reports_report_date
  ON public.quality_daily_reports(report_date DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS trg_quality_daily_reports_updated_at ON public.quality_daily_reports;
    CREATE TRIGGER trg_quality_daily_reports_updated_at
      BEFORE UPDATE ON public.quality_daily_reports
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.quality_daily_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_daily_reports'
      AND policyname = 'quality_daily_reports_service_role'
  ) THEN
    EXECUTE '
      CREATE POLICY "quality_daily_reports_service_role"
      ON public.quality_daily_reports
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
        AND tablename = 'quality_daily_reports'
        AND policyname = 'quality_daily_reports_tenant_isolation'
    ) THEN
      EXECUTE '
        CREATE POLICY "quality_daily_reports_tenant_isolation"
          ON public.quality_daily_reports
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
        AND tablename = 'quality_daily_reports'
        AND policyname = 'quality_daily_reports_tenant_isolation_company_members'
    ) THEN
      EXECUTE '
        CREATE POLICY "quality_daily_reports_tenant_isolation_company_members"
          ON public.quality_daily_reports
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = quality_daily_reports.client_id
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = quality_daily_reports.client_id
            )
          )
      ';
    END IF;
  END IF;
END $$;

GRANT SELECT ON public.quality_daily_reports TO authenticated;
GRANT ALL ON public.quality_daily_reports TO service_role;

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
        AND table_name = 'quality_daily_reports'
        AND constraint_name = 'quality_daily_reports_client_id_fkey'
    ) THEN
      ALTER TABLE public.quality_daily_reports
        ADD CONSTRAINT quality_daily_reports_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.quality_daily_reports IS
  'Daily tenant-level quality KPI snapshots generated automatically by cron.';
