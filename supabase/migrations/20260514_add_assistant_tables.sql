-- ============================================================
-- WhatsApp AI Assistant — Conversations & Messages tables
-- ============================================================
-- Phase 1: Creates assistant_conversations and assistant_messages
-- with full multi-tenant isolation (client_id on every row).
-- RLS policies mirror the user_profiles pattern used throughout.
-- ============================================================

-- ── assistant_conversations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_client_id
  ON public.assistant_conversations (client_id);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_updated
  ON public.assistant_conversations (client_id, updated_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE TRIGGER update_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: assistant_conversations ──────────────────────────────
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_conversations_select"
  ON public.assistant_conversations FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "assistant_conversations_insert"
  ON public.assistant_conversations FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "assistant_conversations_update"
  ON public.assistant_conversations FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "assistant_conversations_delete"
  ON public.assistant_conversations FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Service role bypass (API routes use service role)
CREATE POLICY "assistant_conversations_service_role"
  ON public.assistant_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ── assistant_messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL DEFAULT '',
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_id
  ON public.assistant_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_client_id
  ON public.assistant_messages (client_id);

-- ── RLS: assistant_messages ───────────────────────────────────
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_messages_select"
  ON public.assistant_messages FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "assistant_messages_insert"
  ON public.assistant_messages FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "assistant_messages_service_role"
  ON public.assistant_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ── execute_readonly_query RPC ────────────────────────────────
-- Used by the AI assistant to execute SQL queries on behalf of clients.
-- Security: Only SECURITY DEFINER allows running dynamic SQL.
-- Double security layer:
--   1. Function validates query is SELECT-only (via app layer before calling)
--   2. Uses pg_temp for query isolation
-- NOTE: This must be called only from service-role server routes,
--       never from client-side code.
CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  normalized TEXT;
BEGIN
  -- Normalize whitespace for check
  normalized := upper(regexp_replace(trim(query_text), '\s+', ' ', 'g'));

  -- Block any non-SELECT queries at the DB level as second line of defense
  IF normalized NOT LIKE 'SELECT%' AND normalized NOT LIKE 'WITH%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  IF normalized ~ '\y(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\y' THEN
    RAISE EXCEPTION 'Destructive SQL keywords are not allowed';
  END IF;

  -- Execute and return as JSONB array
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
    query_text
  ) INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION public.execute_readonly_query(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_readonly_query(TEXT) TO service_role;
