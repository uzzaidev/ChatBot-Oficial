-- =====================================================
-- VERIFY VAULT RPC FUNCTIONS
-- =====================================================
-- Run this after applying migration 20251213133305
-- to verify the RPC wrapper functions exist

-- Check if functions exist
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_vault_secret',
    'get_vault_secret',
    'list_vault_secrets'
  )
ORDER BY routine_name;

-- Expected output:
-- routine_name         | routine_type | security_type
-- ---------------------|--------------|---------------
-- create_vault_secret  | FUNCTION     | DEFINER
-- get_vault_secret     | FUNCTION     | DEFINER
-- list_vault_secrets   | FUNCTION     | DEFINER

-- =====================================================
-- TEST: Create a test secret
-- =====================================================

-- Create test secret
SELECT public.create_vault_secret(
  'test_value_12345',
  'test_secret_gateway_verification',
  'Test secret for AI Gateway verification'
) AS test_secret_id;

-- Should return a UUID like: a1b2c3d4-e5f6-7890-abcd-ef1234567890

-- =====================================================
-- TEST: List secrets
-- =====================================================

-- List all secrets (should include test secret)
SELECT * FROM public.list_vault_secrets()
WHERE name = 'test_secret_gateway_verification';

-- Should return:
-- id (UUID) | name | description | created_at

-- =====================================================
-- TEST: Get decrypted secret
-- =====================================================

-- Decrypt test secret
SELECT public.get_vault_secret('test_secret_gateway_verification');

-- Should return: 'test_value_12345'

-- =====================================================
-- CLEANUP: Remove test secret
-- =====================================================

-- Note: Vault secrets are immutable and cannot be deleted
-- via public functions. Only way is to clear the reference
-- in shared_gateway_config or manually via vault schema.

-- This is OK - the test secret won't interfere with anything.

-- =====================================================
-- VERIFY: Check shared_gateway_config exists
-- =====================================================

SELECT * FROM shared_gateway_config;

-- Should return 1 row with:
-- - id (UUID)
-- - gateway_api_key_secret_id (NULL or UUID)
-- - openai_api_key_secret_id (NULL or UUID)
-- - groq_api_key_secret_id (NULL or UUID)
-- - cache_enabled (boolean)
-- - default_fallback_chain (text[])

-- =====================================================
-- SUCCESS!
-- =====================================================
-- If all queries above ran successfully, the RPC functions
-- are working and you can now use the frontend setup page:
-- http://localhost:3000/dashboard/ai-gateway/setup
