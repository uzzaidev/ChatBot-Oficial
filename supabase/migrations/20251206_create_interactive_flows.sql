-- =====================================================
-- Migration: Create Interactive Flows Tables
-- Date: 2025-12-06
-- Phase: Phase 2 - Data Structure
-- Description: Creates tables for interactive flows system
--              with proper multi-tenant isolation and RLS
-- =====================================================

-- =====================================================
-- TABLE: interactive_flows
-- Purpose: Store flow definitions created by clients
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interactive_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Triggers: how the flow is activated
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'qr_code', 'link', 'manual', 'always')),
  trigger_keywords TEXT[], -- Array of keywords that trigger this flow
  trigger_qr_code TEXT,     -- QR code identifier

  -- Flow structure (stored as JSONB for flexibility)
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_block_id TEXT NOT NULL,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT valid_blocks CHECK (jsonb_typeof(blocks) = 'array'),
  CONSTRAINT valid_edges CHECK (jsonb_typeof(edges) = 'array'),
  CONSTRAINT non_empty_name CHECK (char_length(name) > 0)
);

-- =====================================================
-- TABLE: flow_executions
-- Purpose: Track active flow executions for contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.interactive_flows(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL, -- Contact phone (may not be in clientes_whatsapp yet)

  -- Execution state
  current_block_id TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  history JSONB DEFAULT '[]'::jsonb, -- Array of FlowStep objects

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'transferred_ai', 'transferred_human')),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_step_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_variables CHECK (jsonb_typeof(variables) = 'object'),
  CONSTRAINT valid_history CHECK (jsonb_typeof(history) = 'array')
);

-- =====================================================
-- INDEXES: Performance optimization
-- =====================================================

-- Interactive flows indexes
CREATE INDEX IF NOT EXISTS idx_interactive_flows_client 
  ON public.interactive_flows(client_id);

CREATE INDEX IF NOT EXISTS idx_interactive_flows_active 
  ON public.interactive_flows(client_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_interactive_flows_keywords 
  ON public.interactive_flows USING GIN(trigger_keywords) 
  WHERE trigger_type = 'keyword';

CREATE INDEX IF NOT EXISTS idx_interactive_flows_trigger_type 
  ON public.interactive_flows(client_id, trigger_type, is_active);

-- Flow executions indexes
CREATE INDEX IF NOT EXISTS idx_flow_executions_phone 
  ON public.flow_executions(client_id, phone);

CREATE INDEX IF NOT EXISTS idx_flow_executions_active 
  ON public.flow_executions(client_id, phone, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_flow_executions_flow 
  ON public.flow_executions(flow_id);

CREATE INDEX IF NOT EXISTS idx_flow_executions_status 
  ON public.flow_executions(status, last_step_at);

-- =====================================================
-- UNIQUE CONSTRAINT: One active execution per contact
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_execution 
  ON public.flow_executions(client_id, phone) 
  WHERE status = 'active';

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_interactive_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_interactive_flows_updated_at_trigger ON public.interactive_flows;
CREATE TRIGGER update_interactive_flows_updated_at_trigger
  BEFORE UPDATE ON public.interactive_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_interactive_flows_updated_at();

-- =====================================================
-- RLS: Enable Row Level Security
-- =====================================================
ALTER TABLE public.interactive_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: interactive_flows
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their client's flows" ON public.interactive_flows;
DROP POLICY IF EXISTS "Users can create flows for their client" ON public.interactive_flows;
DROP POLICY IF EXISTS "Users can update their client's flows" ON public.interactive_flows;
DROP POLICY IF EXISTS "Users can delete their client's flows" ON public.interactive_flows;

-- Policy: SELECT - Users can view flows belonging to their client
CREATE POLICY "Users can view their client's flows"
  ON public.interactive_flows
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: INSERT - Users can create flows for their client
CREATE POLICY "Users can create flows for their client"
  ON public.interactive_flows
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: UPDATE - Users can update their client's flows
CREATE POLICY "Users can update their client's flows"
  ON public.interactive_flows
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: DELETE - Users can delete their client's flows
CREATE POLICY "Users can delete their client's flows"
  ON public.interactive_flows
  FOR DELETE
  USING (
    client_id IN (
      SELECT client_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: flow_executions
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their client's executions" ON public.flow_executions;
DROP POLICY IF EXISTS "Service role can manage all executions" ON public.flow_executions;

-- Policy: SELECT - Users can view executions belonging to their client
CREATE POLICY "Users can view their client's executions"
  ON public.flow_executions
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: ALL - Service role (backend) can manage all executions
CREATE POLICY "Service role can manage all executions"
  ON public.flow_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS: Documentation for future reference
-- =====================================================

COMMENT ON TABLE public.interactive_flows IS 
  'Stores interactive flow definitions created by clients. Each flow contains a series of blocks (messages, buttons, lists, conditions) connected by edges.';

COMMENT ON COLUMN public.interactive_flows.trigger_type IS 
  'How the flow is activated: keyword (user sends keyword), qr_code (scans QR), link (clicks link), manual (admin triggers), always (first message from new contact)';

COMMENT ON COLUMN public.interactive_flows.trigger_keywords IS 
  'Array of keywords that trigger this flow. Case-insensitive matching. Example: ["oi", "olá", "menu"]';

COMMENT ON COLUMN public.interactive_flows.blocks IS 
  'JSONB array of FlowBlock objects. Each block has: id, type (start/message/interactive_list/interactive_buttons/condition/action/ai_handoff/human_handoff/delay/webhook/end), position {x,y}, data {...}';

COMMENT ON COLUMN public.interactive_flows.edges IS 
  'JSONB array of FlowEdge objects. Each edge connects two blocks: {id, source (block_id), target (block_id), label, type}';

COMMENT ON TABLE public.flow_executions IS 
  'Tracks active flow executions for contacts. One active execution per contact at a time. Contains execution state, variables, and history.';

COMMENT ON COLUMN public.flow_executions.phone IS 
  'Contact phone number in international format (e.g., 5554999999999). May not exist in clientes_whatsapp table yet.';

COMMENT ON COLUMN public.flow_executions.current_block_id IS 
  'ID of the current block being executed. Used to determine next action when user responds.';

COMMENT ON COLUMN public.flow_executions.variables IS 
  'JSONB object storing flow variables. Example: {"escolha_anterior": "suporte", "contador": 3, "nome": "João"}';

COMMENT ON COLUMN public.flow_executions.history IS 
  'JSONB array of FlowStep objects. Each step: {blockId, blockType, executedAt, userResponse, interactiveResponseId, nextBlockId}';

COMMENT ON COLUMN public.flow_executions.status IS 
  'Execution status: active (running), completed (finished), paused (waiting), transferred_ai (sent to AI), transferred_human (sent to human agent)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactive_flows TO authenticated;
GRANT SELECT ON public.flow_executions TO authenticated;

-- Grant all permissions to service role (for backend operations)
GRANT ALL ON public.interactive_flows TO service_role;
GRANT ALL ON public.flow_executions TO service_role;

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================

-- To verify tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('interactive_flows', 'flow_executions');

-- To verify indexes:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('interactive_flows', 'flow_executions');

-- To verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('interactive_flows', 'flow_executions');

-- =====================================================
-- END OF MIGRATION
-- =====================================================
