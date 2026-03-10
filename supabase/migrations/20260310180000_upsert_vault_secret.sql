-- Migration: upsert_client_secret
-- Purpose: Creates or updates a Vault secret by name (handles reconnection without duplicate key errors)

CREATE OR REPLACE FUNCTION upsert_client_secret(
  secret_value TEXT,
  secret_name TEXT,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_id UUID;
  new_id UUID;
BEGIN
  -- Check if a secret with this name already exists
  SELECT id INTO existing_id
  FROM vault.secrets
  WHERE name = secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Update existing secret
    PERFORM vault.update_secret(existing_id, secret_value, secret_name, secret_description);
    RETURN existing_id;
  ELSE
    -- Create new secret
    SELECT vault.create_secret(secret_value, secret_name, secret_description) INTO new_id;
    RETURN new_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION upsert_client_secret IS
'Creates a new Vault secret or updates it if one with the same name exists. Returns the secret UUID.';
