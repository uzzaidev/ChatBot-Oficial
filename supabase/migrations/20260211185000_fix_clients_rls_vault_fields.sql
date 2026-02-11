-- Fix RLS policy to allow updating vault secret fields (including openai_admin_key_secret_id)
-- This ensures client_admins can update ALL secret_id fields in clients table

-- Drop existing policy
DROP POLICY IF EXISTS "Client admins can update own client" ON clients;

-- Recreate policy with explicit permission for all columns (including new vault fields)
-- This allows updates to:
-- - meta_access_token_secret_id
-- - meta_verify_token_secret_id  
-- - meta_app_secret_secret_id
-- - openai_api_key_secret_id
-- - openai_admin_key_secret_id ← NEW field that wasn't working
-- - groq_api_key_secret_id
-- - whatsapp_business_account_id
-- - meta_dataset_id
-- - meta_ad_account_id
-- - And all other client configuration fields

CREATE POLICY "Client admins can update own client"
  ON clients FOR UPDATE
  USING (
    id = auth.user_client_id()
    AND auth.user_role() = 'client_admin'
  )
  WITH CHECK (
    id = auth.user_client_id()
  );

-- Verify policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Client admins can update own client'
  ) THEN
    RAISE EXCEPTION 'Policy "Client admins can update own client" was not created!';
  END IF;
  
  RAISE NOTICE '✅ RLS policy updated successfully - vault fields can now be updated';
END $$;
