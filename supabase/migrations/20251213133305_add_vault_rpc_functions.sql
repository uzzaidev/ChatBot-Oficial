-- =====================================================
-- VAULT RPC WRAPPER FUNCTIONS
-- =====================================================
-- These functions wrap vault.create_secret so it can be
-- called from the Supabase JS client via .rpc()

-- Create or update a vault secret
-- Returns the secret ID (UUID)
CREATE OR REPLACE FUNCTION public.create_vault_secret(
  p_secret TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  -- Check if secret with this name already exists
  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_secret_id IS NOT NULL THEN
    -- Secret exists, return existing ID
    -- Note: Vault secrets are immutable, so we don't update
    RAISE NOTICE 'Secret "%" already exists with ID %', p_name, v_secret_id;
    RETURN v_secret_id;
  END IF;

  -- Create new secret
  SELECT vault.create_secret(
    p_secret,
    p_name,
    p_description
  ) INTO v_secret_id;

  RETURN v_secret_id;
END;
$$;

-- Get decrypted secret by name
-- Returns the decrypted secret value
CREATE OR REPLACE FUNCTION public.get_vault_secret(
  p_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id UUID;
  v_decrypted_secret TEXT;
BEGIN
  -- Find secret ID by name
  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_secret_id IS NULL THEN
    RAISE EXCEPTION 'Secret "%" not found', p_name;
  END IF;

  -- Decrypt secret
  SELECT decrypted_secret INTO v_decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;

  RETURN v_decrypted_secret;
END;
$$;

-- List all vault secrets (metadata only, no decrypted values)
CREATE OR REPLACE FUNCTION public.list_vault_secrets()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, description, created_at
  FROM vault.secrets
  ORDER BY created_at DESC;
$$;

-- Grant execute permissions to authenticated users
-- Note: SECURITY DEFINER means these run with function owner's privileges
-- Only admins should be able to call these (enforce in API layer)
GRANT EXECUTE ON FUNCTION public.create_vault_secret(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_vault_secrets() TO authenticated;

-- Comment on functions
COMMENT ON FUNCTION public.create_vault_secret IS 'Create or get existing vault secret. Returns secret ID.';
COMMENT ON FUNCTION public.get_vault_secret IS 'Get decrypted secret value by name. Admin only.';
COMMENT ON FUNCTION public.list_vault_secrets IS 'List all vault secrets metadata (no decrypted values).';
