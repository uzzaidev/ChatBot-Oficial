-- ============================================================================
-- MIGRATION: Observability traces (Sprint 1)
-- ============================================================================
-- Date: 2026-04-22
-- Goal: message_traces, retrieval_traces, tool_call_traces for full pipeline
--       observability. JSONB-based, multi-tenant (RLS via user_profiles).
-- ============================================================================

-- ═══════════════════════════════════════════════════════
-- message_traces: one row per webhook message processed
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.message_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,

  -- Identification
  conversation_id TEXT,
  whatsapp_message_id TEXT,
  phone TEXT NOT NULL,

  -- Stage timestamps (NULL = stage not reached)
  webhook_received_at   TIMESTAMPTZ,
  normalized_at         TIMESTAMPTZ,
  context_loaded_at     TIMESTAMPTZ,
  embedding_started_at  TIMESTAMPTZ,
  embedding_completed_at TIMESTAMPTZ,
  retrieval_started_at  TIMESTAMPTZ,
  retrieval_completed_at TIMESTAMPTZ,
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  evaluation_enqueued_at TIMESTAMPTZ,

  -- Computed latencies (ms) — filled on finish()
  latency_embedding_ms  INT,
  latency_retrieval_ms  INT,
  latency_generation_ms INT,
  latency_total_ms      INT,

  -- Inputs/outputs
  user_message  TEXT NOT NULL,
  agent_response TEXT,

  -- Model + cost
  model_used    TEXT,
  tokens_input  INT,
  tokens_output INT,
  cost_usd      DECIMAL(12, 8),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'evaluated', 'human_reviewed', 'needs_review', 'failed')),

  -- Flexible extra data (stage metadata, error info, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_traces_client_id  ON message_traces(client_id);
CREATE INDEX IF NOT EXISTS idx_message_traces_phone      ON message_traces(phone);
CREATE INDEX IF NOT EXISTS idx_message_traces_status     ON message_traces(status);
CREATE INDEX IF NOT EXISTS idx_message_traces_created_at ON message_traces(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_traces_wamid_unique
  ON message_traces(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════
-- retrieval_traces: RAG chunks returned for a message
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.retrieval_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id  UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,

  chunk_ids         TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  similarity_scores FLOAT[] NOT NULL DEFAULT ARRAY[]::FLOAT[],
  top_k             INT     NOT NULL,
  threshold         FLOAT   NOT NULL,
  retrieval_strategy TEXT   DEFAULT 'cosine_top_k',

  metadata   JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_traces_trace_id  ON retrieval_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_traces_client_id ON retrieval_traces(client_id);

-- ═══════════════════════════════════════════════════════
-- tool_call_traces: every tool call emitted by the agent
-- ═══════════════════════════════════════════════════════
-- Captures registrar_dado_cadastral, transferir_atendimento,
-- buscar_documento, verificar_agenda, criar_evento_agenda, etc.
-- source: 'agent' = LLM decided, 'fallback' = extractContactDataFallback
CREATE TABLE IF NOT EXISTS public.tool_call_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id  UUID NOT NULL REFERENCES message_traces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,

  tool_name    TEXT NOT NULL,
  tool_call_id TEXT,                         -- provider-returned call id
  arguments    JSONB NOT NULL DEFAULT '{}'::jsonb,
  result       JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'error', 'rejected', 'fallback_triggered')),
  error_message TEXT,

  -- Ordering and timing
  sequence_index INT  NOT NULL DEFAULT 0,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  latency_ms     INT,

  -- Origin of this call
  source TEXT NOT NULL DEFAULT 'agent'
    CHECK (source IN ('agent', 'fallback', 'system')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_call_traces_trace_id  ON tool_call_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_traces_client_id ON tool_call_traces(client_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_traces_tool_name ON tool_call_traces(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_call_traces_status    ON tool_call_traces(status);

-- ═══════════════════════════════════════════════════════
-- RLS — tenant isolation via user_profiles
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.message_traces  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrieval_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_call_traces ENABLE ROW LEVEL SECURITY;

-- Service role bypass (always safe, no external table ref)
CREATE POLICY "message_traces_service_role" ON public.message_traces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "retrieval_traces_service_role" ON public.retrieval_traces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "tool_call_traces_service_role" ON public.tool_call_traces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenant isolation policies (conditional on user_profiles existing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'message_traces' AND policyname = 'message_traces_tenant_isolation'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "message_traces_tenant_isolation" ON public.message_traces
          FOR ALL
          USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
          WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'retrieval_traces' AND policyname = 'retrieval_traces_tenant_isolation'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "retrieval_traces_tenant_isolation" ON public.retrieval_traces
          FOR ALL
          USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
          WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'tool_call_traces' AND policyname = 'tool_call_traces_tenant_isolation'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "tool_call_traces_tenant_isolation" ON public.tool_call_traces
          FOR ALL
          USING (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
          WITH CHECK (client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid()))
      $policy$;
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- Comments
-- ═══════════════════════════════════════════════════════
COMMENT ON TABLE public.message_traces IS
  'One row per WhatsApp message processed. Records per-stage timestamps, model usage, cost and final status.';

COMMENT ON TABLE public.retrieval_traces IS
  'RAG retrieval details per message_trace: chunk IDs, similarity scores, strategy.';

COMMENT ON TABLE public.tool_call_traces IS
  'Every tool call emitted during message processing. source=agent means LLM decided; source=fallback means extractContactDataFallback triggered.';

-- ═══════════════════════════════════════════════════════
-- FK to clients (conditional — table may not exist in all envs)
-- ═══════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'message_traces_client_id_fkey'
    ) THEN
      ALTER TABLE public.message_traces
        ADD CONSTRAINT message_traces_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
