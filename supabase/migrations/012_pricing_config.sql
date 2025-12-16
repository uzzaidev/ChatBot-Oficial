-- =====================================================
-- Migration 012: Pricing Configuration Table
-- =====================================================
-- Allows users to configure custom pricing for AI providers
-- Users can override default pricing per model
-- =====================================================

-- Create pricing_config table
CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'groq', 'whisper'
  model TEXT NOT NULL, -- 'gpt-4', 'gpt-3.5-turbo', 'llama-3.3-70b', etc.
  prompt_price DECIMAL(10, 8) NOT NULL DEFAULT 0, -- Price per 1K prompt tokens
  completion_price DECIMAL(10, 8) NOT NULL DEFAULT 0, -- Price per 1K completion tokens
  unit TEXT DEFAULT 'per_1k_tokens', -- 'per_1k_tokens', 'per_minute'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one config per client/provider/model
  UNIQUE(client_id, provider, model)
);

-- Add indexes for faster lookups
CREATE INDEX idx_pricing_config_client ON pricing_config(client_id);
CREATE INDEX idx_pricing_config_provider_model ON pricing_config(provider, model);

-- Enable RLS (Row Level Security)
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own client's pricing config
CREATE POLICY "Users can view own client pricing config"
  ON pricing_config
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert their own client's pricing config
CREATE POLICY "Users can insert own client pricing config"
  ON pricing_config
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their own client's pricing config
CREATE POLICY "Users can update own client pricing config"
  ON pricing_config
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete their own client's pricing config
CREATE POLICY "Users can delete own client pricing config"
  ON pricing_config
  FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Insert default pricing for all existing clients
-- OpenAI GPT-4
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'openai',
  'gpt-4',
  0.03, -- $0.03 per 1K prompt tokens
  0.06, -- $0.06 per 1K completion tokens
  'per_1k_tokens'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- OpenAI GPT-4 Turbo
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'openai',
  'gpt-4-turbo',
  0.01,
  0.03,
  'per_1k_tokens'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- OpenAI GPT-4o
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'openai',
  'gpt-4o',
  0.005,
  0.015,
  'per_1k_tokens'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- OpenAI GPT-3.5-turbo
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'openai',
  'gpt-3.5-turbo',
  0.0015,
  0.002,
  'per_1k_tokens'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- Groq Llama 3.1 70B (free)
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'groq',
  'llama-3.1-70b-versatile',
  0.0,
  0.0,
  'per_1k_tokens'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- Groq Llama 3.3 70B (free)
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'groq',
  'llama-3.3-70b-versatile',
  0.0,
  0.0,
  'per_1k_tokens'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- Whisper (audio transcription)
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
SELECT
  id,
  'whisper',
  'whisper-1',
  0.006, -- $0.006 per minute
  0.0,
  'per_minute'
FROM clients
ON CONFLICT (client_id, provider, model) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get pricing for a specific model
CREATE OR REPLACE FUNCTION get_model_pricing(
  p_client_id UUID,
  p_provider TEXT,
  p_model TEXT
)
RETURNS TABLE (
  prompt_price DECIMAL,
  completion_price DECIMAL,
  unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.prompt_price,
    pc.completion_price,
    pc.unit
  FROM pricing_config pc
  WHERE pc.client_id = p_client_id
    AND pc.provider = p_provider
    AND pc.model = p_model
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Upsert pricing config
CREATE OR REPLACE FUNCTION upsert_pricing_config(
  p_client_id UUID,
  p_provider TEXT,
  p_model TEXT,
  p_prompt_price DECIMAL,
  p_completion_price DECIMAL,
  p_unit TEXT DEFAULT 'per_1k_tokens'
)
RETURNS pricing_config AS $$
DECLARE
  v_config pricing_config;
BEGIN
  INSERT INTO pricing_config (
    client_id,
    provider,
    model,
    prompt_price,
    completion_price,
    unit,
    updated_at
  ) VALUES (
    p_client_id,
    p_provider,
    p_model,
    p_prompt_price,
    p_completion_price,
    p_unit,
    NOW()
  )
  ON CONFLICT (client_id, provider, model)
  DO UPDATE SET
    prompt_price = p_prompt_price,
    completion_price = p_completion_price,
    unit = p_unit,
    updated_at = NOW()
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_config_timestamp();

-- Comments
COMMENT ON TABLE pricing_config IS 'Configurable pricing for AI providers per client';
COMMENT ON COLUMN pricing_config.prompt_price IS 'Price per 1K prompt tokens (or per minute for audio)';
COMMENT ON COLUMN pricing_config.completion_price IS 'Price per 1K completion tokens';
COMMENT ON COLUMN pricing_config.unit IS 'Pricing unit: per_1k_tokens or per_minute';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- To verify the migration:
-- SELECT * FROM pricing_config LIMIT 10;
-- SELECT * FROM get_model_pricing('your-client-id', 'openai', 'gpt-4');
