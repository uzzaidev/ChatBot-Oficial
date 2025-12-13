-- =====================================================
-- DEBUG AI GATEWAY CONFIGURATION
-- =====================================================
-- Execute este script no Supabase SQL Editor para
-- verificar se os secrets foram salvos corretamente

-- =====================================================
-- 1. CHECK shared_gateway_config
-- =====================================================

SELECT
  id,
  gateway_api_key_secret_id,
  openai_api_key_secret_id,
  groq_api_key_secret_id,
  cache_enabled,
  default_fallback_chain,
  created_at,
  updated_at
FROM shared_gateway_config;

-- Deve retornar:
-- - gateway_api_key_secret_id: UUID ou NULL
-- - openai_api_key_secret_id: UUID ou NULL
-- - groq_api_key_secret_id: UUID ou NULL

-- =====================================================
-- 2. CHECK vault.secrets (metadata only)
-- =====================================================

SELECT
  id,
  name,
  description,
  created_at
FROM vault.secrets
WHERE name LIKE 'shared_%'
ORDER BY created_at DESC;

-- Deve retornar 3 linhas:
-- - shared_gateway_api_key
-- - shared_openai_api_key
-- - shared_groq_api_key

-- =====================================================
-- 3. CHECK if secret IDs match
-- =====================================================

-- Get config secret IDs
WITH config_ids AS (
  SELECT
    gateway_api_key_secret_id,
    openai_api_key_secret_id,
    groq_api_key_secret_id
  FROM shared_gateway_config
  LIMIT 1
)
-- Check if these IDs exist in vault.secrets
SELECT
  'gateway_api_key' AS key_type,
  c.gateway_api_key_secret_id AS config_secret_id,
  s.id AS vault_secret_id,
  s.name AS vault_secret_name,
  CASE
    WHEN c.gateway_api_key_secret_id = s.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM config_ids c
LEFT JOIN vault.secrets s ON s.id = c.gateway_api_key_secret_id

UNION ALL

SELECT
  'openai_api_key' AS key_type,
  c.openai_api_key_secret_id AS config_secret_id,
  s.id AS vault_secret_id,
  s.name AS vault_secret_name,
  CASE
    WHEN c.openai_api_key_secret_id = s.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM config_ids c
LEFT JOIN vault.secrets s ON s.id = c.openai_api_key_secret_id

UNION ALL

SELECT
  'groq_api_key' AS key_type,
  c.groq_api_key_secret_id AS config_secret_id,
  s.id AS vault_secret_id,
  s.name AS vault_secret_name,
  CASE
    WHEN c.groq_api_key_secret_id = s.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM config_ids c
LEFT JOIN vault.secrets s ON s.id = c.groq_api_key_secret_id;

-- Deve retornar 3 linhas com status ✅ MATCH

-- =====================================================
-- 4. TEST DECRYPTION (shows first 10 chars only)
-- =====================================================

-- Gateway API Key
SELECT
  s.name,
  LEFT(ds.decrypted_secret, 10) || '...' AS secret_preview,
  LENGTH(ds.decrypted_secret) AS secret_length,
  CASE
    WHEN ds.decrypted_secret IS NULL THEN '❌ NULL'
    WHEN ds.decrypted_secret = '' THEN '❌ EMPTY'
    WHEN LENGTH(ds.decrypted_secret) > 0 THEN '✅ HAS VALUE'
  END AS status
FROM vault.secrets s
LEFT JOIN vault.decrypted_secrets ds ON ds.id = s.id
WHERE s.name = 'shared_gateway_api_key';

-- OpenAI API Key
SELECT
  s.name,
  LEFT(ds.decrypted_secret, 10) || '...' AS secret_preview,
  LENGTH(ds.decrypted_secret) AS secret_length,
  CASE
    WHEN ds.decrypted_secret IS NULL THEN '❌ NULL'
    WHEN ds.decrypted_secret = '' THEN '❌ EMPTY'
    WHEN LENGTH(ds.decrypted_secret) > 0 THEN '✅ HAS VALUE'
  END AS status
FROM vault.secrets s
LEFT JOIN vault.decrypted_secrets ds ON ds.id = s.id
WHERE s.name = 'shared_openai_api_key';

-- Groq API Key
SELECT
  s.name,
  LEFT(ds.decrypted_secret, 10) || '...' AS secret_preview,
  LENGTH(ds.decrypted_secret) AS secret_length,
  CASE
    WHEN ds.decrypted_secret IS NULL THEN '❌ NULL'
    WHEN ds.decrypted_secret = '' THEN '❌ EMPTY'
    WHEN LENGTH(ds.decrypted_secret) > 0 THEN '✅ HAS VALUE'
  END AS status
FROM vault.secrets s
LEFT JOIN vault.decrypted_secrets ds ON ds.id = s.id
WHERE s.name = 'shared_groq_api_key';

-- =====================================================
-- 5. TEST RPC FUNCTION (if migration was applied)
-- =====================================================

-- Try to get OpenAI key using the RPC wrapper
SELECT public.get_vault_secret('shared_openai_api_key') AS openai_key_test;

-- If this returns an error, the RPC function doesn't exist yet
-- If it returns empty '', the secret exists but is empty
-- If it returns the key, everything is working!

-- =====================================================
-- ANALYSIS
-- =====================================================

-- Compare the results:
--
-- PROBLEMA POSSÍVEL #1: Secret IDs não batem (❌ MISMATCH na query 3)
-- SOLUÇÃO: Reconfigure via frontend ou SQL
--
-- PROBLEMA POSSÍVEL #2: Secrets existem mas estão vazios (❌ EMPTY na query 4)
-- SOLUÇÃO: Os secrets foram criados com string vazia
--          Você precisa deletar e recriar com os valores corretos
--
-- PROBLEMA POSSÍVEL #3: RPC function não existe (erro na query 5)
-- SOLUÇÃO: Aplicar migration: npx supabase db push
--
-- PROBLEMA POSSÍVEL #4: Decrypted_secret é NULL (❌ NULL na query 4)
-- SOLUÇÃO: Problema com Vault encryption, verificar config do Supabase
