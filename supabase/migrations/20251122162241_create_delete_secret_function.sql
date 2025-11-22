-- ============================================================================
-- CREATE: delete_client_secret function
-- ============================================================================
-- Purpose: Deletes a secret from Supabase Vault
-- Reason: Supabase client cannot access vault.secrets table directly from Node.js
-- Date: 2025-11-22
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_client_secret(
  secret_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete secret from vault
  DELETE FROM vault.secrets WHERE id = secret_id;

  -- Check if deletion was successful
  IF NOT FOUND THEN
    RAISE NOTICE 'Secret % not found or already deleted', secret_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting secret %: %', secret_id, SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION delete_client_secret IS
'Deletes a secret from Supabase Vault. Returns TRUE on success, FALSE if secret not found or error occurred.';

-- Test the function
DO $$
DECLARE
  test_secret_id UUID;
  delete_result BOOLEAN;
BEGIN
  -- Create test secret
  SELECT vault.create_secret('test-value-to-delete', 'test-delete-function', 'Testing delete function') INTO test_secret_id;

  RAISE NOTICE 'Test secret created: %', test_secret_id;

  -- Delete it
  SELECT delete_client_secret(test_secret_id) INTO delete_result;

  IF delete_result = TRUE THEN
    RAISE NOTICE ' delete_client_secret function is working correctly!';
  ELSE
    RAISE WARNING 'L delete_client_secret function test FAILED!';
  END IF;
END $$;
