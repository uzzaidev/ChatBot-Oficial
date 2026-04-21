-- ============================================================================
-- MIGRATION: Fix trace tenant isolation policies for environments without
--            public.user_profiles.
-- ============================================================================
-- Date: 2026-04-21
-- Goal: Ensure authenticated users can read traces only for clients that
--       belong to their tenant membership (company_members -> uzzapp_clients).
-- ============================================================================

DO $$
BEGIN
  -- Apply only when both mapping tables exist in this environment.
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
        AND tablename = 'message_traces'
        AND policyname = 'message_traces_tenant_isolation_company_members'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "message_traces_tenant_isolation_company_members"
          ON public.message_traces
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = message_traces.client_id
            )
          )
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'retrieval_traces'
        AND policyname = 'retrieval_traces_tenant_isolation_company_members'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "retrieval_traces_tenant_isolation_company_members"
          ON public.retrieval_traces
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = retrieval_traces.client_id
            )
          )
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tool_call_traces'
        AND policyname = 'tool_call_traces_tenant_isolation_company_members'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "tool_call_traces_tenant_isolation_company_members"
          ON public.tool_call_traces
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.uzzapp_clients uc
                ON uc.tenant_id = cm.tenant_id
              WHERE cm.user_id = auth.uid()
                AND uc.id = tool_call_traces.client_id
            )
          )
      $policy$;
    END IF;
  END IF;
END $$;

