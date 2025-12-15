-- =====================================================
-- AI GATEWAY - SETUP KEYS VIA SQL
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- Substitua os valores das keys pelas suas keys reais

-- =====================================================
-- 1. CREATE SECRETS IN VAULT
-- =====================================================

-- Gateway API Key (vck_...)
SELECT vault.create_secret(
  'vck_4a4BgUYsrXlTsKaaH9R8uGRw8FR7IipUGf660FfqnX6CcdpFyb2f9Qm4',
  'shared_gateway_api_key',
  'Shared Vercel AI Gateway API Key'
) AS gateway_key_id;
-- ANOTE o ID retornado!

-- OpenAI API Key (sk-proj-...)
SELECT vault.create_secret(
  'COLE_SUA_OPENAI_KEY_AQUI',  -- Substitua pela sua key
  'shared_openai_api_key',
  'Shared OpenAI API Key'
) AS openai_key_id;
-- ANOTE o ID retornado!

-- Groq API Key (gsk_...)
SELECT vault.create_secret(
  'COLE_SUA_GROQ_KEY_AQUI',  -- Substitua pela sua key
  'shared_groq_api_key',
  'Shared Groq API Key'
) AS groq_key_id;
-- ANOTE o ID retornado!

-- Anthropic API Key (opcional - sk-ant-...)
-- SELECT vault.create_secret(
--   'COLE_SUA_ANTHROPIC_KEY_AQUI',
--   'shared_anthropic_api_key',
--   'Shared Anthropic API Key'
-- ) AS anthropic_key_id;

-- Google API Key (opcional - AIza...)
-- SELECT vault.create_secret(
--   'COLE_SUA_GOOGLE_KEY_AQUI',
--   'shared_google_api_key',
--   'Shared Google API Key'
-- ) AS google_key_id;

-- =====================================================
-- 2. UPDATE shared_gateway_config
-- =====================================================
-- IMPORTANTE: Substitua os UUIDs pelos IDs anotados acima!

UPDATE shared_gateway_config
SET
  gateway_api_key_secret_id = 'UUID_DO_GATEWAY_KEY',  -- Substitua!
  openai_api_key_secret_id = 'UUID_DA_OPENAI_KEY',    -- Substitua!
  groq_api_key_secret_id = 'UUID_DA_GROQ_KEY',        -- Substitua!
  -- anthropic_api_key_secret_id = 'UUID_DA_ANTHROPIC_KEY',  -- Opcional
  -- google_api_key_secret_id = 'UUID_DA_GOOGLE_KEY',        -- Opcional
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
-- 4. ENABLE GATEWAY FOR TEST CLIENT
-- =====================================================

-- Listar clientes
SELECT id, name, slug, use_ai_gateway FROM clients LIMIT 5;

-- Habilitar para 1 cliente de teste (substitua o ID)
UPDATE clients
SET use_ai_gateway = true
WHERE id = 'COLE_O_CLIENT_ID_AQUI';

-- Verificar
SELECT id, name, use_ai_gateway
FROM clients
WHERE use_ai_gateway = true;

-- =====================================================
-- DONE!
-- =====================================================
-- Agora teste:
-- curl http://localhost:3000/api/test/gateway
