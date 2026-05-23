-- Message-level feedback from the conversations UI.
-- Used to flag outbound AI/human replies with like, dislike, or bug reviews
-- and link them back to message_traces whenever a trace can be resolved.

CREATE TABLE IF NOT EXISTS public.message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trace_id UUID REFERENCES public.message_traces(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL,
  wamid TEXT,
  phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  message_direction TEXT NOT NULL DEFAULT 'outgoing',
  feedback TEXT NOT NULL CHECK (feedback IN ('like', 'dislike', 'bug')),
  observations TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_feedback_client_message_unique UNIQUE (client_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_message_feedback_client_created
  ON public.message_feedback(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_feedback_trace
  ON public.message_feedback(trace_id)
  WHERE trace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_feedback_type
  ON public.message_feedback(client_id, feedback);

CREATE INDEX IF NOT EXISTS idx_message_feedback_phone
  ON public.message_feedback(client_id, phone);

ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_feedback_service_role"
  ON public.message_feedback
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "message_feedback_tenant_select"
  ON public.message_feedback
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT user_profiles.client_id
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "message_feedback_tenant_insert"
  ON public.message_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT user_profiles.client_id
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "message_feedback_tenant_update"
  ON public.message_feedback
  FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT user_profiles.client_id
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT user_profiles.client_id
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.message_feedback TO authenticated;
GRANT ALL ON public.message_feedback TO service_role;

COMMENT ON TABLE public.message_feedback IS
  'Feedback saved from conversation message bubbles and linked to message_traces when possible.';
