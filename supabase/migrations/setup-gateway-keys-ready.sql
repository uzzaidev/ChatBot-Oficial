-- =====================================================
-- AI GATEWAY - SETUP KEYS VIA SQL
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- ATENÇÃO: Cole sua OpenAI key na linha 20!

-- =====================================================
-- 1. CREATE SECRETS IN VAULT
-- =====================================================

-- Gateway API Key (vck_...)
SELECT vault.create_secret(
  'vck_4a4BgUYsrXlTsKaaH9R8uGRw8FR7IipUGf660FfqnX6CcdpFyb2f9Qm4',
  'shared_gateway_api_key',
  'Shared Vercel AI Gateway API Key'
) AS gateway_key_id;
-- ANOTE o UUID retornado!

-- OpenAI API Key (sk-proj-...)
SELECT vault.create_secret(
  'COLE_SUA_OPENAI_KEY_AQUI',  -- ⚠️ EDITE ESTA LINHA!
  'shared_openai_api_key',
  'Shared OpenAI API Key'
) AS openai_key_id;
-- ANOTE o UUID retornado!

-- Groq API Key (gsk_...)
SELECT vault.create_secret(
  'COLE_SUA_GROQ_KEY_AQUI',  -- ⚠️ EDITE ESTA LINHA!
  'shared_groq_api_key',
  'Shared Groq API Key'
) AS groq_key_id;
-- ANOTE o UUID retornado!

-- =====================================================
-- 2. UPDATE shared_gateway_config
-- =====================================================
-- IMPORTANTE: Substitua os UUIDs pelos retornados acima!

-- Exemplo de UUIDs (SUBSTITUA pelos seus!):
-- gateway_key_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- openai_key_id:  b2c3d4e5-f6a7-8901-bcde-f12345678901
-- groq_key_id:    c3d4e5f6-a7b8-9012-cdef-123456789012

UPDATE shared_gateway_config
SET
  gateway_api_key_secret_id = 'UUID_DO_GATEWAY_KEY',  -- Substitua!
  openai_api_key_secret_id = 'UUID_DA_OPENAI_KEY',    -- Substitua!
  groq_api_key_secret_id = 'UUID_DA_GROQ_KEY',        -- Substitua!
  updated_at = NOW();

-- =====================================================
-- 3. VERIFY CONFIGURATION
-- =====================================================

-- Ver config atual
SELECT
  id,
  gateway_api_key_secret_id,
  openai_api_key_secret_id,
  groq_api_key_secret_id,
  cache_enabled,
  default_fallback_chain,
  updated_at
FROM shared_gateway_config;

-- Ver secrets criados (SEM mostrar valores - seguro)
SELECT
  id,
  name,
  description,
  created_at
FROM vault.secrets
WHERE name LIKE 'shared_%'
ORDER BY created_at DESC;

-- =====================================================
-- DONE!
-- =====================================================
-- Agora teste:
-- curl "http://localhost:3000/api/test/gateway?clientId=b21b314f-c49a-467d-94b3-a21ed4412227"
