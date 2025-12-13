-- =====================================================
-- AI GATEWAY - SIMPLIFY TO SHARED CONFIG
-- =====================================================
-- Description: Simplifies gateway architecture to use shared keys
-- Date: 2025-12-12
-- Architecture: One gateway key + provider keys shared across all clients
-- =====================================================

-- =====================================================
-- 1. DROP gateway_configurations (multi-tenant config)
-- =====================================================
-- Não precisamos de config separada por cliente
-- Vamos usar config compartilhada

DROP TABLE IF EXISTS gateway_configurations CASCADE;

-- =====================================================
-- 2. CREATE shared_gateway_config (global config)
-- =====================================================
-- Apenas 1 registro nesta tabela
-- Armazena as keys compartilhadas de todos os providers

CREATE TABLE IF NOT EXISTS shared_gateway_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gateway key (vck_...) - compartilhada por todos os clientes
  gateway_api_key_secret_id UUID REFERENCES vault.secrets(id),

  -- Provider API keys (custom keys) - compartilhadas
  openai_api_key_secret_id UUID REFERENCES vault.secrets(id),
  groq_api_key_secret_id UUID REFERENCES vault.secrets(id),
  anthropic_api_key_secret_id UUID REFERENCES vault.secrets(id),
  google_api_key_secret_id UUID REFERENCES vault.secrets(id),

  -- Cache settings (global)
  cache_enabled BOOLEAN DEFAULT true,
  cache_ttl_seconds INTEGER DEFAULT 3600,

  -- Default fallback chain (global)
  -- Example: ["openai/gpt-4o", "groq/llama-3.3-70b-versatile"]
  default_fallback_chain JSONB DEFAULT '[]'::jsonb,

  -- Rate limits (global)
  max_requests_per_minute INTEGER DEFAULT 1000,
  max_tokens_per_minute INTEGER DEFAULT 500000,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only ONE record allowed in this table
CREATE UNIQUE INDEX idx_shared_gateway_config_singleton ON shared_gateway_config ((true));

-- Updated trigger
CREATE OR REPLACE FUNCTION update_shared_gateway_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shared_gateway_config_updated_at
  BEFORE UPDATE ON shared_gateway_config
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_gateway_config_updated_at();

-- RLS Policies
ALTER TABLE shared_gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shared gateway config"
  ON shared_gateway_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Anyone authenticated can view shared config"
  ON shared_gateway_config
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 3. MODIFY clients table
-- =====================================================
-- Remove colunas de gateway que não são mais necessárias
-- Mantém use_ai_gateway (feature flag por cliente)

ALTER TABLE clients
  DROP COLUMN IF EXISTS gateway_api_key_secret_id,
  DROP COLUMN IF EXISTS gateway_key_name;

-- use_ai_gateway já existe (criada em migration anterior)
-- Não precisa adicionar novamente

-- =====================================================
-- 4. INSERT default config (placeholder)
-- =====================================================
-- Insere 1 registro vazio (será preenchido no setup)

INSERT INTO shared_gateway_config (
  cache_enabled,
  cache_ttl_seconds,
  default_fallback_chain,
  max_requests_per_minute,
  max_tokens_per_minute
) VALUES (
  true,
  3600,
  '["openai/gpt-4o-mini", "groq/llama-3.3-70b-versatile"]'::jsonb,
  1000,
  500000
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE shared_gateway_config IS 'Global AI Gateway configuration - ONE record only - keys shared across all clients';
COMMENT ON COLUMN shared_gateway_config.gateway_api_key_secret_id IS 'Vercel AI Gateway key (vck_...) - shared by all clients';
COMMENT ON COLUMN shared_gateway_config.openai_api_key_secret_id IS 'OpenAI API key (sk-...) - shared by all clients';
COMMENT ON COLUMN shared_gateway_config.groq_api_key_secret_id IS 'Groq API key (gsk_...) - shared by all clients';
COMMENT ON COLUMN shared_gateway_config.default_fallback_chain IS 'Global fallback chain - array of model identifiers';

-- =====================================================
-- VALIDATION
-- =====================================================
-- Verify table was created
-- SELECT * FROM shared_gateway_config;

-- Verify clients table was modified
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'clients' AND column_name LIKE '%gateway%';
