-- ============================================================================
-- MIGRATION: Atomic human feedback submit RPC (Sprint 4 hardening)
-- ============================================================================
-- Date: 2026-05-13
-- Goal:
--   - Ensure promote-to-ground-truth + human_feedback upsert + trace status
--     update happen atomically in a single DB transaction.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_human_feedback_atomic(
  p_trace_id UUID,
  p_client_id UUID,
  p_operator_id UUID,
  p_verdict TEXT,
  p_correction_text TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_error_category TEXT DEFAULT NULL,
  p_promote_to_ground_truth BOOLEAN DEFAULT false,
  p_ground_truth_expected_response TEXT DEFAULT NULL,
  p_query_embedding_text TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  trace_id UUID,
  evaluation_id UUID,
  client_id UUID,
  operator_id UUID,
  verdict TEXT,
  correction_text TEXT,
  reason TEXT,
  error_category TEXT,
  marked_as_ground_truth BOOLEAN,
  ground_truth_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_is_authorized BOOLEAN := false;
  v_eval_id UUID;
  v_gt_id UUID;
  v_feedback public.human_feedback%ROWTYPE;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_operator_id IS NULL OR p_operator_id <> v_auth_uid THEN
    RAISE EXCEPTION 'operator_mismatch';
  END IF;

  IF p_verdict NOT IN ('correct', 'incorrect', 'partial') THEN
    RAISE EXCEPTION 'invalid_verdict';
  END IF;

  IF p_error_category IS NOT NULL
     AND p_error_category NOT IN (
       'wrong_chunk',
       'bad_generation',
       'missing_info',
       'hallucination',
       'gt_outdated',
       'other'
     ) THEN
    RAISE EXCEPTION 'invalid_error_category';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = v_auth_uid
        AND up.client_id = p_client_id
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized
     AND EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'company_members'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'uzzapp_clients'
     ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.company_members cm
      JOIN public.uzzapp_clients uc
        ON uc.tenant_id = cm.tenant_id
      WHERE cm.user_id = v_auth_uid
        AND uc.id = p_client_id
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'unauthorized_client';
  END IF;

  PERFORM 1
  FROM public.message_traces mt
  WHERE mt.id = p_trace_id
    AND mt.client_id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'trace_not_found';
  END IF;

  SELECT ae.id
  INTO v_eval_id
  FROM public.agent_evaluations ae
  WHERE ae.trace_id = p_trace_id
    AND ae.client_id = p_client_id
  ORDER BY ae.evaluated_at DESC NULLS LAST
  LIMIT 1;

  v_gt_id := NULL;
  IF p_promote_to_ground_truth THEN
    IF COALESCE(BTRIM(p_ground_truth_expected_response), '') = '' THEN
      RAISE EXCEPTION 'ground_truth_expected_response_required';
    END IF;

    IF COALESCE(BTRIM(p_query_embedding_text), '') = '' THEN
      RAISE EXCEPTION 'query_embedding_required';
    END IF;

    INSERT INTO public.ground_truth (
      client_id,
      user_query,
      expected_response,
      query_embedding,
      source,
      source_trace_id,
      created_by,
      confidence,
      version,
      metadata
    )
    SELECT
      p_client_id,
      mt.user_message,
      p_ground_truth_expected_response,
      p_query_embedding_text::vector(1536),
      'operator_correction',
      p_trace_id,
      p_operator_id,
      0.85,
      1,
      COALESCE(p_metadata, '{}'::jsonb)
    FROM public.message_traces mt
    WHERE mt.id = p_trace_id
      AND mt.client_id = p_client_id
    RETURNING public.ground_truth.id INTO v_gt_id;
  END IF;

  INSERT INTO public.human_feedback (
    trace_id,
    evaluation_id,
    client_id,
    operator_id,
    verdict,
    correction_text,
    reason,
    error_category,
    marked_as_ground_truth,
    ground_truth_id,
    metadata
  )
  VALUES (
    p_trace_id,
    v_eval_id,
    p_client_id,
    p_operator_id,
    p_verdict,
    p_correction_text,
    p_reason,
    p_error_category,
    p_promote_to_ground_truth,
    v_gt_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (trace_id, operator_id)
  DO UPDATE SET
    evaluation_id = EXCLUDED.evaluation_id,
    verdict = EXCLUDED.verdict,
    correction_text = EXCLUDED.correction_text,
    reason = EXCLUDED.reason,
    error_category = EXCLUDED.error_category,
    marked_as_ground_truth = EXCLUDED.marked_as_ground_truth,
    ground_truth_id = EXCLUDED.ground_truth_id,
    metadata = EXCLUDED.metadata
  RETURNING * INTO v_feedback;

  UPDATE public.message_traces
  SET status = 'human_reviewed'
  WHERE id = p_trace_id
    AND client_id = p_client_id;

  RETURN QUERY
  SELECT
    v_feedback.id,
    v_feedback.trace_id,
    v_feedback.evaluation_id,
    v_feedback.client_id,
    v_feedback.operator_id,
    v_feedback.verdict,
    v_feedback.correction_text,
    v_feedback.reason,
    v_feedback.error_category,
    v_feedback.marked_as_ground_truth,
    v_feedback.ground_truth_id,
    v_feedback.metadata,
    v_feedback.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_human_feedback_atomic(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT,
  TEXT,
  JSONB
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_human_feedback_atomic(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT,
  TEXT,
  JSONB
) TO service_role;

COMMENT ON FUNCTION public.submit_human_feedback_atomic(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT,
  TEXT,
  JSONB
) IS
  'Atomically upserts human feedback and optionally promotes correction to ground_truth in a single transaction.';
