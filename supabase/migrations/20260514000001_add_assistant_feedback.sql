-- ──────────────────────────────────────────────────────────────────────────────
-- assistant_feedback
--
-- Stores user feedback (like / dislike / bug) on individual AI assistant
-- responses, together with the originating question and any SQL query used.
-- This allows the team to review low-quality answers and improve the system.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.assistant_feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id UUID        REFERENCES public.assistant_conversations(id) ON DELETE SET NULL,
  question        TEXT,               -- user message that triggered the response
  sql_query       TEXT,               -- first SQL executed (if any)
  response        TEXT        NOT NULL, -- the AI response being rated
  feedback        TEXT        NOT NULL CHECK (feedback IN ('like', 'dislike', 'bug')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant-scoped lookups
CREATE INDEX idx_assistant_feedback_client     ON public.assistant_feedback(client_id, created_at DESC);
CREATE INDEX idx_assistant_feedback_type       ON public.assistant_feedback(client_id, feedback);

-- RLS
ALTER TABLE public.assistant_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_own_tenant"
  ON public.assistant_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "feedback_select_own_tenant"
  ON public.assistant_feedback
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.assistant_feedback IS
  'User feedback on AI assistant responses (like/dislike/bug) with question and SQL context.';
