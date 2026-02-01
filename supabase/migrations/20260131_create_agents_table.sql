-- Migration: Create agents table for multi-agent configuration
-- This enables users to create multiple AI agents with different personalities and settings

-- ============================================
-- 1. AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '🤖',
  description TEXT,

  -- Status
  is_active BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- === COMO RESPONDER (Tone & Style) ===
  response_tone TEXT DEFAULT 'professional' CHECK (response_tone IN ('formal', 'friendly', 'professional', 'casual')),
  response_style TEXT DEFAULT 'helpful' CHECK (response_style IN ('helpful', 'direct', 'educational', 'consultative')),
  language TEXT DEFAULT 'pt-BR',
  use_emojis BOOLEAN DEFAULT false,
  max_response_length TEXT DEFAULT 'medium' CHECK (max_response_length IN ('short', 'medium', 'long')),

  -- === O QUE FAZER (Behavior) ===
  role_description TEXT,
  primary_goal TEXT,
  forbidden_topics TEXT[] DEFAULT '{}',
  always_mention TEXT[] DEFAULT '{}',
  greeting_message TEXT,
  fallback_message TEXT,

  -- === FERRAMENTAS (Tools) ===
  enable_human_handoff BOOLEAN DEFAULT true,
  enable_document_search BOOLEAN DEFAULT false,
  enable_audio_response BOOLEAN DEFAULT false,

  -- === INTEGRACOES (Integrations) ===
  enable_rag BOOLEAN DEFAULT false,
  rag_threshold NUMERIC DEFAULT 0.7 CHECK (rag_threshold >= 0 AND rag_threshold <= 1),
  rag_max_results INTEGER DEFAULT 5 CHECK (rag_max_results >= 1 AND rag_max_results <= 20),

  -- === MODELO IA (AI Model) ===
  primary_provider TEXT DEFAULT 'groq' CHECK (primary_provider IN ('groq', 'openai')),
  openai_model TEXT DEFAULT 'gpt-4o',
  groq_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  temperature NUMERIC DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 8000),

  -- === PROMPT COMPILADO (Generated) ===
  compiled_system_prompt TEXT,
  compiled_formatter_prompt TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only ONE active agent per client (when is_active = true)
CREATE UNIQUE INDEX idx_agents_active_per_client
ON agents(client_id) WHERE is_active = true AND is_archived = false;

-- Standard indexes
CREATE INDEX idx_agents_client_id ON agents(client_id);
CREATE INDEX idx_agents_slug ON agents(client_id, slug);
CREATE INDEX idx_agents_is_active ON agents(is_active) WHERE is_archived = false;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agents_updated_at();

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Users can view agents from their client
CREATE POLICY "agents_select_policy" ON agents
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can insert agents for their client
CREATE POLICY "agents_insert_policy" ON agents
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update agents from their client
CREATE POLICY "agents_update_policy" ON agents
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete agents from their client
CREATE POLICY "agents_delete_policy" ON agents
  FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Service role bypass (for API routes)
CREATE POLICY "agents_service_role_all" ON agents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. ADD active_agent_id TO clients TABLE
-- ============================================
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS active_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

COMMENT ON COLUMN clients.active_agent_id IS
  'Reference to the currently active agent for this client. NULL means using legacy system_prompt.';

-- ============================================
-- 4. AGENT VERSIONS TABLE (Version History)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Complete snapshot of the agent at this version
  snapshot JSONB NOT NULL,

  -- Metadata
  change_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_versions_agent ON agent_versions(agent_id);
CREATE INDEX idx_agent_versions_number ON agent_versions(agent_id, version_number DESC);

-- RLS for agent_versions
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_versions_select_policy" ON agent_versions
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE client_id IN (
        SELECT client_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "agent_versions_insert_policy" ON agent_versions
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE client_id IN (
        SELECT client_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "agent_versions_service_role" ON agent_versions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 5. AGENT SCHEDULES TABLE (Activation Scheduling)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Configuration
  is_enabled BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Schedule rules (JSON array)
  -- Format: [{"agent_id": "uuid", "days": [1,2,3,4,5], "start": "08:00", "end": "18:00"}]
  rules JSONB DEFAULT '[]'::jsonb,

  -- Default agent for uncovered times
  default_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One schedule config per client
  UNIQUE(client_id)
);

-- RLS for agent_schedules
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_schedules_select_policy" ON agent_schedules
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "agent_schedules_upsert_policy" ON agent_schedules
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "agent_schedules_service_role" ON agent_schedules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 6. AGENT EXPERIMENTS TABLE (A/B Testing)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Configuration
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,

  -- Agents in the test
  agent_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Traffic distribution (0-100, percentage for agent A)
  traffic_split INTEGER DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),

  -- Metrics (auto-updated)
  total_conversations INTEGER DEFAULT 0,
  agent_a_conversations INTEGER DEFAULT 0,
  agent_b_conversations INTEGER DEFAULT 0,

  -- Period
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only ONE active experiment per client
CREATE UNIQUE INDEX idx_experiments_active_per_client
ON agent_experiments(client_id) WHERE is_active = true;

CREATE INDEX idx_experiments_client ON agent_experiments(client_id);

-- RLS for agent_experiments
ALTER TABLE agent_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experiments_select_policy" ON agent_experiments
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "experiments_all_policy" ON agent_experiments
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "experiments_service_role" ON agent_experiments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 7. EXPERIMENT ASSIGNMENTS TABLE (Sticky assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES agent_experiments(id) ON DELETE CASCADE,
  conversation_id UUID,
  assigned_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One assignment per phone per experiment (sticky)
  UNIQUE(experiment_id, phone)
);

CREATE INDEX idx_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX idx_assignments_phone ON experiment_assignments(experiment_id, phone);

-- RLS for experiment_assignments
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select_policy" ON experiment_assignments
  FOR SELECT
  USING (
    experiment_id IN (
      SELECT id FROM agent_experiments WHERE client_id IN (
        SELECT client_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "assignments_service_role" ON experiment_assignments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 8. HELPER FUNCTION: Get Active Agent for Conversation
-- ============================================
CREATE OR REPLACE FUNCTION get_active_agent_for_conversation(
  p_client_id UUID,
  p_phone TEXT,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo'
)
RETURNS UUID AS $$
DECLARE
  v_agent_id UUID;
  v_experiment RECORD;
  v_schedule RECORD;
  v_current_day INTEGER;
  v_current_time TIME;
  v_rule JSONB;
BEGIN
  -- 1. Check for active A/B experiment
  SELECT * INTO v_experiment
  FROM agent_experiments
  WHERE client_id = p_client_id AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    -- Check for existing assignment
    SELECT assigned_agent_id INTO v_agent_id
    FROM experiment_assignments
    WHERE experiment_id = v_experiment.id AND phone = p_phone;

    IF v_agent_id IS NOT NULL THEN
      RETURN v_agent_id;
    END IF;

    -- Random assignment based on traffic split
    IF random() * 100 < v_experiment.traffic_split THEN
      v_agent_id := v_experiment.agent_a_id;
    ELSE
      v_agent_id := v_experiment.agent_b_id;
    END IF;

    -- Save assignment
    INSERT INTO experiment_assignments (experiment_id, assigned_agent_id, phone)
    VALUES (v_experiment.id, v_agent_id, p_phone);

    -- Update counters
    UPDATE agent_experiments
    SET total_conversations = total_conversations + 1,
        agent_a_conversations = agent_a_conversations + CASE WHEN v_agent_id = agent_a_id THEN 1 ELSE 0 END,
        agent_b_conversations = agent_b_conversations + CASE WHEN v_agent_id = agent_b_id THEN 1 ELSE 0 END
    WHERE id = v_experiment.id;

    RETURN v_agent_id;
  END IF;

  -- 2. Check for active schedule
  SELECT * INTO v_schedule
  FROM agent_schedules
  WHERE client_id = p_client_id AND is_enabled = true
  LIMIT 1;

  IF FOUND AND v_schedule.rules IS NOT NULL AND jsonb_array_length(v_schedule.rules) > 0 THEN
    v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE COALESCE(v_schedule.timezone, p_timezone));
    v_current_time := (NOW() AT TIME ZONE COALESCE(v_schedule.timezone, p_timezone))::TIME;

    FOR v_rule IN SELECT * FROM jsonb_array_elements(v_schedule.rules)
    LOOP
      IF v_current_day = ANY(ARRAY(SELECT jsonb_array_elements_text(v_rule->'days')::INTEGER))
         AND v_current_time >= (v_rule->>'start')::TIME
         AND v_current_time < (v_rule->>'end')::TIME
      THEN
        RETURN (v_rule->>'agent_id')::UUID;
      END IF;
    END LOOP;

    -- No matching rule, use default
    IF v_schedule.default_agent_id IS NOT NULL THEN
      RETURN v_schedule.default_agent_id;
    END IF;
  END IF;

  -- 3. Fallback to client's active_agent_id
  SELECT active_agent_id INTO v_agent_id
  FROM clients
  WHERE id = p_client_id;

  RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. COMMENTS
-- ============================================
COMMENT ON TABLE agents IS 'Multi-agent configuration for AI assistants';
COMMENT ON TABLE agent_versions IS 'Version history for agent configurations';
COMMENT ON TABLE agent_schedules IS 'Time-based agent activation schedules';
COMMENT ON TABLE agent_experiments IS 'A/B testing experiments between agents';
COMMENT ON TABLE experiment_assignments IS 'Sticky phone-to-agent assignments for A/B tests';
COMMENT ON FUNCTION get_active_agent_for_conversation IS 'Returns the active agent ID considering experiments, schedules, and fallback';
